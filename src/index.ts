import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/error-handler";
import { apiRouter } from "./routes";

export const app = new Hono();

// 全局中间件
app.use("*", cors());

// API 认证中间件
app.use("/api/*", requireAuth);

// 注册 API 路由
app.route("/api", apiRouter);

// 全局错误处理
app.onError(errorHandler);

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};
