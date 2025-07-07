import { describe, expect, test, beforeEach, afterEach } from "vitest";
import {
  createTestApp,
  withAuthHeader,
  expectStatus,
  expectJson,
} from "./test-utils";
import { redis } from "../src/db";

describe("邀请码功能测试", () => {
  const app = createTestApp();
  const testToken = "test-token";
  const testTeamId = "test-team-123";
  const testUserId = "test-user-456";

  // 在每个测试前清理 Redis 数据
  beforeEach(async () => {
    const keys = await redis.keys("*");
    if (keys.length > 0) {
      await redis.del(keys);
    }
  });

  // 在每个测试后清理 Redis 数据
  afterEach(async () => {
    const keys = await redis.keys("*");
    if (keys.length > 0) {
      await redis.del(keys);
    }
  });

  test("创建邀请码 - 成功场景", async () => {
    const now = Date.now();
    const expireAt = now + 24 * 60 * 60 * 1000; // 24小时后过期

    const response = await app.fetch("/api/invite", {
      method: "POST",
      ...withAuthHeader(testToken),
      body: {
        team_id: testTeamId,
        expire_at: expireAt,
      },
    });

    await expectStatus(response, 200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.team_id).toBe(testTeamId);
    expect(body.data.expire_at).toBe(expireAt);
    expect(body.data.invite_code).toMatch(/^[A-Z0-9]{8}$/);

    // 验证邀请码已存储在 Redis 中
    const inviteCode = body.data.invite_code;
    const storedInvite = await redis.get(`invite:${inviteCode}`);
    expect(storedInvite).toBeTruthy();

    const parsedInvite = JSON.parse(storedInvite!);
    expect(parsedInvite.team_id).toBe(testTeamId);
    expect(parsedInvite.expire_at).toBe(expireAt);
    expect(parsedInvite.used).toBe(false);
  });

  test("创建邀请码 - 过期时间已过", async () => {
    const now = Date.now();
    const expireAt = now - 1000; // 过期时间在过去

    const response = await app.fetch("/api/invite", {
      method: "POST",
      ...withAuthHeader(testToken),
      body: {
        team_id: testTeamId,
        expire_at: expireAt,
      },
    });

    await expectStatus(response, 200);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVITE_CODE_EXPIRE_TIME_PAST");
    expect(body.error.message).toBe("邀请码过期时间不能是过去的时间");
  });

  test("验证邀请码 - 有效邀请码", async () => {
    // 先创建一个邀请码
    const now = Date.now();
    const expireAt = now + 24 * 60 * 60 * 1000;

    const createResponse = await app.fetch("/api/invite", {
      method: "POST",
      ...withAuthHeader(testToken),
      body: {
        team_id: testTeamId,
        expire_at: expireAt,
      },
    });

    await expectStatus(createResponse, 200);
    const createBody = await createResponse.json();
    const inviteCode = createBody.data.invite_code;

    // 验证邀请码
    const verifyResponse = await app.fetch("/api/invite/verify", {
      method: "POST",
      ...withAuthHeader(testToken),
      body: {
        invite_code: inviteCode,
      },
    });

    await expectStatus(verifyResponse, 200);
    const body = await verifyResponse.json();

    expect(body.success).toBe(true);
    expect(body.data.team_id).toBe(testTeamId);
    expect(body.data.valid).toBe(true);
  });

  test("使用邀请码 - 成功场景", async () => {
    // 先创建一个邀请码
    const now = Date.now();
    const expireAt = now + 24 * 60 * 60 * 1000;

    const createResponse = await app.fetch("/api/invite", {
      method: "POST",
      ...withAuthHeader(testToken),
      body: {
        team_id: testTeamId,
        expire_at: expireAt,
      },
    });

    await expectStatus(createResponse, 200);
    const createBody = await createResponse.json();
    const inviteCode = createBody.data.invite_code;

    // 使用邀请码
    const useResponse = await app.fetch("/api/invite/use", {
      method: "POST",
      ...withAuthHeader(testToken),
      body: {
        invite_code: inviteCode,
        user_id: testUserId,
      },
    });

    await expectStatus(useResponse, 200);
    const body = await useResponse.json();

    expect(body.success).toBe(true);
    expect(body.data.team_id).toBe(testTeamId);
    expect(body.data.user_id).toBe(testUserId);

    // 验证用户已被添加到团队
    const isMember = await redis.sismember(
      `team:${testTeamId}:members`,
      testUserId
    );
    expect(isMember).toBe(1);

    // 验证邀请码已被标记为已使用
    const storedInvite = await redis.get(`invite:${inviteCode}`);
    const parsedInvite = JSON.parse(storedInvite!);
    expect(parsedInvite.used).toBe(true);
    expect(parsedInvite.used_by).toBe(testUserId);
  });

  test("使用邀请码 - 重复使用", async () => {
    // 先创建一个邀请码
    const now = Date.now();
    const expireAt = now + 24 * 60 * 60 * 1000;

    const createResponse = await app.fetch("/api/invite", {
      method: "POST",
      ...withAuthHeader(testToken),
      body: {
        team_id: testTeamId,
        expire_at: expireAt,
      },
    });

    await expectStatus(createResponse, 200);
    const createBody = await createResponse.json();
    const inviteCode = createBody.data.invite_code;

    // 第一次使用邀请码
    await app.fetch("/api/invite/use", {
      method: "POST",
      ...withAuthHeader(testToken),
      body: {
        invite_code: inviteCode,
        user_id: testUserId,
      },
    });

    // 尝试重复使用邀请码
    const secondUseResponse = await app.fetch("/api/invite/use", {
      method: "POST",
      ...withAuthHeader(testToken),
      body: {
        invite_code: inviteCode,
        user_id: "another-user-789",
      },
    });

    await expectStatus(secondUseResponse, 200);
    const body = await secondUseResponse.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVITE_CODE_ALREADY_USED");
    expect(body.error.message).toBe("邀请码已被使用");
  });

  test("获取团队邀请码列表", async () => {
    // 创建多个邀请码
    const now = Date.now();
    const expireAt = now + 24 * 60 * 60 * 1000;

    // 创建第一个邀请码
    await app.fetch("/api/invite", {
      method: "POST",
      ...withAuthHeader(testToken),
      body: {
        team_id: testTeamId,
        expire_at: expireAt,
      },
    });

    // 创建第二个邀请码
    await app.fetch("/api/invite", {
      method: "POST",
      ...withAuthHeader(testToken),
      body: {
        team_id: testTeamId,
        expire_at: expireAt,
      },
    });

    // 获取团队邀请码列表
    const listResponse = await app.fetch(`/api/team/${testTeamId}/invites`, {
      ...withAuthHeader(testToken),
    });

    await expectStatus(listResponse, 200);
    const body = await listResponse.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(2);

    // 验证返回的邀请码数据结构
    const firstInvite = body.data[0];
    expect(firstInvite.team_id).toBe(testTeamId);
    expect(firstInvite.expire_at).toBe(expireAt);
    expect(firstInvite.used).toBe(false);
    expect(firstInvite.code).toMatch(/^[A-Z0-9]{8}$/);
  });

  test("创建邀请码 - 超过限制", async () => {
    const now = Date.now();
    const expireAt = now + 24 * 60 * 60 * 1000;

    // 创建51个邀请码（超过50个限制）
    for (let i = 0; i < 50; i++) {
      await app.fetch("/api/invite", {
        method: "POST",
        ...withAuthHeader(testToken),
        body: {
          team_id: testTeamId,
          expire_at: expireAt,
        },
      });
    }

    // 尝试创建第51个邀请码
    const response = await app.fetch("/api/invite", {
      method: "POST",
      ...withAuthHeader(testToken),
      body: {
        team_id: testTeamId,
        expire_at: expireAt,
      },
    });

    await expectStatus(response, 200);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVITE_CODE_TOO_MANY");
    expect(body.error.message).toBe("邀请码数量已达到上限");
  });
});
