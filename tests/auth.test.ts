import { describe, it, expect } from "vitest";
import { app } from "../src/index";
import env from "../src/env";

describe("Auth Middleware", () => {
  const validToken = env.SECRET_TOKEN;

  it("should allow requests with valid token", async () => {
    const req = new Request("http://localhost/api/parse", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: "https://example.com" }),
    });

    const res = await app.fetch(req);
    expect(res.status).not.toBe(401);
  });

  it("should reject requests without token", async () => {
    const req = new Request("http://localhost/api/parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: "https://example.com" }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(401);
  });

  it("should reject requests with invalid token", async () => {
    const req = new Request("http://localhost/api/parse", {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: "https://example.com" }),
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(401);
  });
});
