import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { app } from "../src/index";
import env from "../src/env";
import { redis, generateCacheKey, CACHE_TTL } from "../src/db";
import { mockExtractMetadata } from "./setup";

describe("API Endpoints", () => {
  const token = env.SECRET_TOKEN;
  const testUrl = "https://example.com";

  beforeEach(async () => {
    // 清理测试数据
    const keys = await redis.keys("metadata:*");
    if (keys.length > 0) {
      await redis.del(keys);
    }
    vi.clearAllMocks();
  });

  afterAll(async () => {
    // 清理并关闭 Redis 连接
    const keys = await redis.keys("metadata:*");
    if (keys.length > 0) {
      await redis.del(keys);
    }
    await redis.quit();
  });

  it("POST /api/parse -> should parse metadata and cache it", async () => {
    const mockMetadata = {
      url: testUrl,
      title: "Test Title",
      description: "Test Description",
      image: "https://example.com/image.jpg",
      favicon: "https://example.com/favicon.ico",
      type: "website",
      siteName: "Test Site",
      locale: "en_US",
    };

    const req = new Request("http://localhost/api/parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url: testUrl }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("data");
    expect(body.data).toMatchObject(mockMetadata);
    expect(body.data).toHaveProperty("cachedAt");
    expect(typeof body.data.cachedAt).toBe("string");

    // 验证数据已被缓存
    const cachedData = await redis.get(generateCacheKey(testUrl));
    expect(cachedData).toBeTruthy();

    const parsedCache = JSON.parse(cachedData!);
    expect(parsedCache).toMatchObject(mockMetadata);
    expect(parsedCache).toHaveProperty("cachedAt");

    // 验证 TTL
    const ttl = await redis.ttl(generateCacheKey(testUrl));
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(CACHE_TTL);

    // 验证 extractMetadata 被调用
    expect(mockExtractMetadata).toHaveBeenCalledWith(testUrl);
  });

  it("POST /api/parse -> should return cached data if available", async () => {
    const mockMetadata = {
      url: testUrl,
      title: "Cached Title",
      description: "Cached Description",
      cachedAt: new Date().toISOString(),
    };

    // 预先缓存数据
    await redis.setex(
      generateCacheKey(testUrl),
      CACHE_TTL,
      JSON.stringify(mockMetadata)
    );

    const req = new Request("http://localhost/api/parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url: testUrl }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("success", true);
    expect(body.data).toMatchObject(mockMetadata);

    // 验证 extractMetadata 没有被调用
    expect(mockExtractMetadata).not.toHaveBeenCalled();
  });

  it("POST /api/parse -> should return 400 for invalid URL", async () => {
    const req = new Request("http://localhost/api/parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ url: "not-a-url" }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error", "Invalid URL");
  });
});
