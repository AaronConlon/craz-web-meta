/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      all: true,
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.d.ts", "**/index.ts"],
    },
    env: {
      NODE_ENV: "test",
      VITEST: "true",
      SECRET_TOKEN: "test-token",
      REDIS_HOST: "localhost",
      REDIS_PORT: "6379",
    },
  },
});
