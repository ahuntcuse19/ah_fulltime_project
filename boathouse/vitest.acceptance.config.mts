import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/acceptance/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/acceptance/setup.ts"],
    testTimeout: 180_000,
    hookTimeout: 180_000,
    fileParallelism: false,
  },
});
