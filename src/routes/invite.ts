import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { redis } from "../db";
import { ERROR_CODES } from "../constants/error-codes";
import { sendSuccess, sendError, getErrorMessage } from "../utils/response";

export const inviteRouter = new Hono();

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
inviteRouter.post(
  "/",
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
        return sendError(
          c,
          ERROR_CODES.INVITE_CODE_TOO_MANY,
          getErrorMessage(ERROR_CODES.INVITE_CODE_TOO_MANY)
        );
      }

      // 生成邀请码
      const inviteCode = generateInviteCode();

      // 统一使用毫秒级时间戳
      const now = Date.now();

      // 如果传入的过期时间已经过期，直接返回错误
      if (expire_at <= now) {
        return sendError(
          c,
          ERROR_CODES.INVITE_CODE_EXPIRE_TIME_PAST,
          getErrorMessage(ERROR_CODES.INVITE_CODE_EXPIRE_TIME_PAST),
          {
            now,
            expire_at,
            time_diff: now - expire_at,
            expire_at_formatted: new Date(expire_at).toISOString(),
            now_formatted: new Date(now).toISOString(),
          }
        );
      }

      const ttl = Math.floor((expire_at - now) / 1000); // 转换为秒用于Redis TTL

      // 添加调试信息
      console.log("Creating invite code debug:", {
        team_id,
        expire_at,
        now,
        ttl,
        expire_at_formatted: new Date(expire_at).toISOString(),
        now_formatted: new Date(now).toISOString(),
      });

      // 存储邀请码信息到 Redis
      const inviteData = {
        team_id,
        created_at: Math.floor(now / 1000), // 存储秒级时间戳
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

      return sendSuccess(c, {
        invite_code: inviteCode,
        team_id,
        expire_at,
        ttl,
        debug: {
          now,
          expire_at_formatted: new Date(expire_at).toISOString(),
          ttl_hours: Math.floor(ttl / 3600),
        },
      });
    } catch (error) {
      console.error("Error creating invite code:", error);
      return sendError(
        c,
        ERROR_CODES.INVITE_CODE_CREATE_FAILED,
        getErrorMessage(ERROR_CODES.INVITE_CODE_CREATE_FAILED)
      );
    }
  }
);

// 验证邀请码
inviteRouter.post(
  "/verify",
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
        return sendError(
          c,
          ERROR_CODES.INVITE_CODE_INVALID,
          getErrorMessage(ERROR_CODES.INVITE_CODE_INVALID)
        );
      }

      const invite = JSON.parse(inviteData);

      // 检查是否已过期
      const now = Date.now();

      // 添加调试信息
      console.log("Invite verification debug:", {
        invite_code,
        now,
        expire_at: invite.expire_at,
        time_diff: now - invite.expire_at,
        is_expired: now > invite.expire_at,
        invite_data: invite,
      });

      if (now > invite.expire_at) {
        // 删除过期的邀请码
        await redis.del(`invite:${invite_code}`);
        await redis.srem(`team:${invite.team_id}:invites`, invite_code);
        return sendError(
          c,
          ERROR_CODES.INVITE_CODE_EXPIRED,
          getErrorMessage(ERROR_CODES.INVITE_CODE_EXPIRED),
          {
            now,
            expire_at: invite.expire_at,
            time_diff: now - invite.expire_at,
          }
        );
      }

      // 检查是否已被使用
      if (invite.used) {
        return sendError(
          c,
          ERROR_CODES.INVITE_CODE_ALREADY_USED,
          getErrorMessage(ERROR_CODES.INVITE_CODE_ALREADY_USED)
        );
      }

      return sendSuccess(c, {
        team_id: invite.team_id,
        created_at: invite.created_at,
        expire_at: invite.expire_at,
        valid: true,
        debug: {
          now,
          time_remaining: invite.expire_at - now,
        },
      });
    } catch (error) {
      console.error("Error verifying invite code:", error);
      return sendError(
        c,
        ERROR_CODES.INVITE_CODE_VERIFY_FAILED,
        getErrorMessage(ERROR_CODES.INVITE_CODE_VERIFY_FAILED)
      );
    }
  }
);

// 使用邀请码
inviteRouter.post(
  "/use",
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
        return sendError(
          c,
          ERROR_CODES.INVITE_CODE_INVALID,
          getErrorMessage(ERROR_CODES.INVITE_CODE_INVALID)
        );
      }

      const invite = JSON.parse(inviteData);

      // 检查是否已过期
      const now = Date.now();

      // 添加调试信息
      console.log("Using invite code debug:", {
        invite_code,
        now,
        expire_at: invite.expire_at,
        time_diff: now - invite.expire_at,
        is_expired: now > invite.expire_at,
        invite_data: invite,
      });

      if (now > invite.expire_at) {
        // 删除过期的邀请码
        await redis.del(`invite:${invite_code}`);
        await redis.srem(`team:${invite.team_id}:invites`, invite_code);
        return sendError(
          c,
          ERROR_CODES.INVITE_CODE_EXPIRED,
          getErrorMessage(ERROR_CODES.INVITE_CODE_EXPIRED),
          {
            now,
            expire_at: invite.expire_at,
            time_diff: now - invite.expire_at,
          }
        );
      }

      // 检查是否已被使用
      if (invite.used) {
        return sendError(
          c,
          ERROR_CODES.INVITE_CODE_ALREADY_USED,
          getErrorMessage(ERROR_CODES.INVITE_CODE_ALREADY_USED)
        );
      }

      // 标记邀请码为已使用
      invite.used = true;
      invite.used_by = user_id;
      invite.used_at = Math.floor(now / 1000); // 存储秒级时间戳

      // 更新 Redis 中的邀请码信息
      const ttl = Math.floor((invite.expire_at - now) / 1000); // 转换为秒用于Redis TTL
      if (ttl > 0) {
        await redis.setex(`invite:${invite_code}`, ttl, JSON.stringify(invite));
      }

      // 将用户添加到团队
      await redis.sadd(`team:${invite.team_id}:members`, user_id);

      return sendSuccess(c, {
        team_id: invite.team_id,
        user_id,
        joined_at: Math.floor(now / 1000), // 返回秒级时间戳
      });
    } catch (error) {
      console.error("Error using invite code:", error);
      return sendError(
        c,
        ERROR_CODES.INVITE_CODE_USE_FAILED,
        getErrorMessage(ERROR_CODES.INVITE_CODE_USE_FAILED)
      );
    }
  }
);