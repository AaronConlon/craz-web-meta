import { z } from "zod";

const envSchema = z.object({
  // Redis 配置
  REDIS_HOST: z.string().default("104.168.83.218"),
  REDIS_PORT: z.string().default("16379"),
  REDIS_PASSWORD: z.string().optional(),

  // JWT 配置
  SECRET_TOKEN: z.string().default("your-secret-token"),
});

const env = envSchema.parse(process.env);

export default env;
