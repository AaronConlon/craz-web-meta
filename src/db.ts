import Redis from "ioredis";
import env from "./env";

// 测试环境使用内存 Redis Mock
class MockRedis {
  private storage = new Map<string, string>();
  private sets = new Map<string, Set<string>>();
  private ttls = new Map<string, number>();

  async get(key: string): Promise<string | null> {
    if (this.isExpired(key)) {
      this.storage.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.storage.get(key) || null;
  }

  async setex(key: string, ttl: number, value: string): Promise<"OK"> {
    this.storage.set(key, value);
    this.ttls.set(key, Date.now() + ttl * 1000);
    return "OK";
  }

  async del(key: string | string[]): Promise<number> {
    const keys = Array.isArray(key) ? key : [key];
    let deleted = 0;
    
    for (const k of keys) {
      if (this.storage.has(k)) {
        this.storage.delete(k);
        this.ttls.delete(k);
        deleted++;
      }
      if (this.sets.has(k)) {
        this.sets.delete(k);
        deleted++;
      }
    }
    
    return deleted;
  }

  async keys(pattern: string): Promise<string[]> {
    if (pattern === "*") {
      return Array.from(this.storage.keys()).concat(Array.from(this.sets.keys()));
    }
    // 简单的 * 通配符支持
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return Array.from(this.storage.keys())
      .concat(Array.from(this.sets.keys()))
      .filter(key => regex.test(key));
  }

  async smembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    let added = 0;
    
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    
    let removed = 0;
    for (const member of members) {
      if (set.has(member)) {
        set.delete(member);
        removed++;
      }
    }
    
    if (set.size === 0) {
      this.sets.delete(key);
    }
    
    return removed;
  }

  async sismember(key: string, member: string): Promise<0 | 1> {
    const set = this.sets.get(key);
    return set && set.has(member) ? 1 : 0;
  }

  private isExpired(key: string): boolean {
    const ttl = this.ttls.get(key);
    if (!ttl) return false;
    return Date.now() > ttl;
  }

  async ttl(key: string): Promise<number> {
    const expiry = this.ttls.get(key);
    if (!expiry) return -1; // 不存在或无过期时间
    const now = Date.now();
    if (now >= expiry) {
      this.storage.delete(key);
      this.ttls.delete(key);
      return -2; // 已过期
    }
    return Math.floor((expiry - now) / 1000); // 返回剩余秒数
  }

  async quit(): Promise<void> {
    // 清理所有数据
    this.storage.clear();
    this.sets.clear();
    this.ttls.clear();
  }

  // 模拟事件监听器
  on(event: string, listener: (...args: any[]) => void) {
    // 测试环境不需要真实的事件监听
  }
}

// Redis 连接配置
const createRedisInstance = () => {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return new MockRedis() as any;
  }
  
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

  return redis;
};

const redis = createRedisInstance();

// 缓存有效期（3天）
export const CACHE_TTL = 60 * 60 * 24 * 3; // 3 days in seconds

// 生成缓存 key
export const generateCacheKey = (url: string) => `metadata:${url}`;

export { redis };
