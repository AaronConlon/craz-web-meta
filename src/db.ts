import Redis from "ioredis";
import env from "./env";

// Redis 连接配置
const redis = new Redis({
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT),
  password: env.REDIS_PASSWORD,
  // Redis 操作超时设置
  commandTimeout: 3000, // 命令超时 3 秒
  maxRetriesPerRequest: 2, // 每个请求最多重试 2 次
  retryStrategy(times) {
    const delay = Math.min(times * 200, 1000); // 重试延迟，最大 1 秒
    return delay;
  },
});

// Redis 错误处理
redis.on("error", (error) => {
  console.error("Redis error:", error);
});

// 缓存有效期（3天）
export const CACHE_TTL = 60 * 60 * 24 * 3; // 3 days in seconds

// 生成缓存 key
export const generateCacheKey = (url: string) => `metadata:${url}`;

export { redis };
