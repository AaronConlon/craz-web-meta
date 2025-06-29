import { Hono } from "hono";
import { CACHE_TTL, generateCacheKey, redis } from "./db";
import { requireAuth } from "./middleware/auth";
import { metadataSchema } from "./types";
import { extractMetadata, validateUrl } from "./utils/metadata";
import { cors } from "hono/cors";

export const app = new Hono();

// 验证必要的元数据字段
function validateMetadata(metadata: any) {
  console.log("metadata", metadata);
  const requiredFields = ["title", "description", "image"];
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
  if (!isValidMeta) {
    return c.json({ error: "Invalid metadata" }, 400);
  }
  const cacheKey = generateCacheKey(url);
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(metadata));
  return c.json({ success: true });
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

export default app;
