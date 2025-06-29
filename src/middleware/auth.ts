import { Context, Next } from "hono";
import env from "../env";

export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];

  if (token !== env.SECRET_TOKEN) {
    return c.json({ error: "Invalid token" }, 401);
  }

  await next();
}
