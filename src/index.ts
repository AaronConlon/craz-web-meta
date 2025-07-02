import { Hono } from "hono";
import { CACHE_TTL, generateCacheKey, redis } from "./db";
import { requireAuth } from "./middleware/auth";
import { metadataSchema } from "./types";
import { extractMetadata, validateUrl } from "./utils/metadata";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

export const app = new Hono();

// 验证必要的元数据字段
function validateMetadata(metadata: any) {
  console.log("metadata", metadata);
  const requiredFields = ["title", "image"];
  const missingFields = requiredFields.filter((field) => !metadata[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required metadata: ${missingFields.join(", ")}`);
  }

  return true;
}

// disable cors
app.use("*", cors());

// Auth middleware
app.use("/api/*", requireAuth);

// URL metadata parse endpoint
app.post("/api/parse", async (c) => {
  try {
    const { url } = await c.req.json();

    console.log("url", url);

    // 验证 URL 格式
    try {
      await metadataSchema.parseAsync({ url });
    } catch (error) {
      return c.json({ error: "Invalid URL" }, 400);
    }

    if (!validateUrl(url)) {
      return c.json({ error: "Invalid URL" }, 400);
    }

    const cacheKey = generateCacheKey(url);

    try {
      // 尝试从缓存获取数据
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        // 验证缓存的数据是否包含所有必要字段
        validateMetadata(parsedData);
        return c.json({
          success: true,
          data: parsedData,
        });
      }

      // 如果缓存中没有，则解析元数据
      const metadata = await extractMetadata(url);

      // 验证获取的元数据是否包含所有必要字段
      validateMetadata(metadata);

      const resultData = {
        url,
        ...metadata,
        cachedAt: new Date().toISOString(),
      };

      // 保存到 Redis 并设置过期时间
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(resultData));

      return c.json({
        success: true,
        data: resultData,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Request timeout") {
          return c.json({ error: "Request timeout" }, 504);
        }
        if (error.message.includes("Redis")) {
          return c.json({ error: "Cache service unavailable" }, 503);
        }
        if (error.message.includes("Missing required metadata")) {
          return c.json({ error: error.message }, 400);
        }
      }
      throw error;
    }
  } catch (error) {
    console.error("Error parsing metadata:", error);
    return c.json({ error: "Failed to parse metadata" }, 500);
  }
});

// Add a route to update metadata
app.post("/api/update", async (c) => {
  const { url, metadata } = await c.req.json();

  const isValidMeta = validateMetadata(metadata);

  if (!metadata.description) {
    metadata.description = "No description";
  }

  if (!isValidMeta) {
    return c.json({ error: "Invalid metadata" }, 400);
  }
  const cacheKey = generateCacheKey(url);
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(metadata));
  return c.json({ success: true });
});

// 生成邀请码
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 创建邀请码
app.post(
  "/api/invite",
  zValidator(
    "json",
    z.object({
      team_id: z.string().min(1).max(64),
      expire_at: z.number().min(0),
    })
  ),
  async (c) => {
    try {
      const { team_id, expire_at } = c.req.valid("json");

      // 禁止创建超过 50 个邀请码
      const inviteCodes = await redis.smembers(`team:${team_id}:invites`);
      if (inviteCodes.length >= 50) {
        return c.json({ error: "Too many invites" }, 400);
      }

      // 生成邀请码
      const inviteCode = generateInviteCode();

      // 计算过期时间（秒）
      const now = Math.floor(Date.now() / 1000);
      const ttl = expire_at > now ? expire_at - now : 3600 * 24; // 默认1天

      // 存储邀请码信息到 Redis
      const inviteData = {
        team_id,
        created_at: now,
        expire_at,
        used: false,
        used_by: null,
        used_at: null,
      };

      // 使用邀请码作为 key，存储邀请信息
      await redis.setex(
        `invite:${inviteCode}`,
        ttl,
        JSON.stringify(inviteData)
      );

      // 同时存储团队的所有邀请码列表
      await redis.sadd(`team:${team_id}:invites`, inviteCode);

      return c.json({
        success: true,
        data: {
          invite_code: inviteCode,
          team_id,
          expire_at,
          ttl,
        },
      });
    } catch (error) {
      console.error("Error creating invite code:", error);
      return c.json({ error: "Failed to create invite code" }, 500);
    }
  }
);

// 验证邀请码
app.post(
  "/api/invite/verify",
  zValidator(
    "json",
    z.object({
      invite_code: z.string().length(8),
    })
  ),
  async (c) => {
    try {
      const { invite_code } = c.req.valid("json");

      // 从 Redis 获取邀请码信息
      const inviteData = await redis.get(`invite:${invite_code}`);

      if (!inviteData) {
        return c.json({ error: "Invalid or expired invite code" }, 400);
      }

      const invite = JSON.parse(inviteData);

      // 检查是否已过期
      const now = Math.floor(Date.now() / 1000);
      if (now > invite.expire_at) {
        // 删除过期的邀请码
        await redis.del(`invite:${invite_code}`);
        await redis.srem(`team:${invite.team_id}:invites`, invite_code);
        return c.json({ error: "Invite code has expired" }, 400);
      }

      // 检查是否已被使用
      if (invite.used) {
        return c.json({ error: "Invite code has already been used" }, 400);
      }

      return c.json({
        success: true,
        data: {
          team_id: invite.team_id,
          created_at: invite.created_at,
          expire_at: invite.expire_at,
          valid: true,
        },
      });
    } catch (error) {
      console.error("Error verifying invite code:", error);
      return c.json({ error: "Failed to verify invite code" }, 500);
    }
  }
);

// 使用邀请码
app.post(
  "/api/invite/use",
  zValidator(
    "json",
    z.object({
      invite_code: z.string().length(8),
      user_id: z.string().min(1),
    })
  ),
  async (c) => {
    try {
      const { invite_code, user_id } = c.req.valid("json");

      // 从 Redis 获取邀请码信息
      const inviteData = await redis.get(`invite:${invite_code}`);

      if (!inviteData) {
        return c.json({ error: "Invalid or expired invite code" }, 400);
      }

      const invite = JSON.parse(inviteData);

      // 检查是否已过期
      const now = Math.floor(Date.now() / 1000);
      if (now > invite.expire_at) {
        // 删除过期的邀请码
        await redis.del(`invite:${invite_code}`);
        await redis.srem(`team:${invite.team_id}:invites`, invite_code);
        return c.json({ error: "Invite code has expired" }, 400);
      }

      // 检查是否已被使用
      if (invite.used) {
        return c.json({ error: "Invite code has already been used" }, 400);
      }

      // 标记邀请码为已使用
      invite.used = true;
      invite.used_by = user_id;
      invite.used_at = now;

      // 更新 Redis 中的邀请码信息
      const ttl = invite.expire_at - now;
      if (ttl > 0) {
        await redis.setex(`invite:${invite_code}`, ttl, JSON.stringify(invite));
      }

      // 将用户添加到团队
      await redis.sadd(`team:${invite.team_id}:members`, user_id);

      return c.json({
        success: true,
        data: {
          team_id: invite.team_id,
          user_id,
          joined_at: now,
        },
      });
    } catch (error) {
      console.error("Error using invite code:", error);
      return c.json({ error: "Failed to use invite code" }, 500);
    }
  }
);

// 获取团队的邀请码列表
app.get("/api/team/:team_id/invites", async (c) => {
  try {
    const team_id = c.req.param("team_id");

    // 获取团队的所有邀请码
    const inviteCodes = await redis.smembers(`team:${team_id}:invites`);

    // 获取每个邀请码的详细信息
    const invites = [];
    for (const code of inviteCodes) {
      const inviteData = await redis.get(`invite:${code}`);
      if (inviteData) {
        invites.push({
          code,
          ...JSON.parse(inviteData),
        });
      }
    }

    return c.json({
      success: true,
      data: invites,
    });
  } catch (error) {
    console.error("Error getting team invites:", error);
    return c.json({ error: "Failed to get team invites" }, 500);
  }
});

// OpenAPI documentation endpoint
app.get("/api/docs", (c) => {
  return c.json({
    openapi: "3.0.0",
    info: {
      title: "Web Metadata API",
      version: "1.0.0",
      description: "API for extracting and managing web metadata",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    tags: [
      {
        name: "metadata",
        description: "Web metadata operations",
      },
    ],
    paths: {
      "/api/parse": {
        post: {
          tags: ["metadata"],
          summary: "Extract metadata from URL",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MetadataRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successfully extracted metadata",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/MetadataResponse",
                  },
                },
              },
            },
            "400": {
              description: "Invalid request",
            },
            "401": {
              description: "Unauthorized",
            },
            "500": {
              description: "Internal server error",
            },
          },
        },
      },
    },
    components: {
      schemas: {
        MetadataRequest: {
          type: "object",
          properties: {
            url: {
              type: "string",
              format: "uri",
            },
          },
          required: ["url"],
        },
        MetadataResponse: {
          type: "object",
          properties: {
            url: {
              type: "string",
              format: "uri",
            },
            title: {
              type: "string",
            },
            description: {
              type: "string",
            },
            image: {
              type: "string",
              format: "uri",
            },
            favicon: {
              type: "string",
              format: "uri",
            },
            type: {
              type: "string",
            },
            siteName: {
              type: "string",
            },
            locale: {
              type: "string",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
          required: ["id", "url", "createdAt", "updatedAt"],
        },
      },
    },
  });
});

// Error handling
app.onError((error, c) => {
  console.error(error);
  if (error instanceof Error) {
    if (error.message === "Request timeout") {
      return c.json({ error: "Request timeout" }, 504);
    }
    if (error.message.includes("Redis")) {
      return c.json({ error: "Cache service unavailable" }, 503);
    }
  }
  return c.json({ error: "Internal server error" }, 500);
});

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};
