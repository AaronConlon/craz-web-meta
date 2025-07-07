import { Hono } from "hono";
import { metadataRouter } from "./metadata";
import { inviteRouter } from "./invite";
import { teamRouter } from "./team";
import { docsRouter } from "./docs";

export const apiRouter = new Hono();

// 注册所有路由模块
apiRouter.route("/", metadataRouter);
apiRouter.route("/invite", inviteRouter);
apiRouter.route("/team", teamRouter);
apiRouter.route("/docs", docsRouter);

export { metadataRouter, inviteRouter, teamRouter, docsRouter };