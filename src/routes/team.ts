import { Hono } from "hono";
import { redis } from "../db";
import { ERROR_CODES } from "../constants/error-codes";
import { sendSuccess, sendError, getErrorMessage } from "../utils/response";

export const teamRouter = new Hono();

// 获取团队的邀请码列表
teamRouter.get("/:team_id/invites", async (c) => {
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

    return sendSuccess(c, invites);
  } catch (error) {
    console.error("Error getting team invites:", error);
    return sendError(
      c,
      ERROR_CODES.TEAM_INVITES_FETCH_FAILED,
      getErrorMessage(ERROR_CODES.TEAM_INVITES_FETCH_FAILED)
    );
  }
});