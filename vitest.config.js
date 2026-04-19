import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__tests__/**/*.spec.js"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.worktrees/**"],
  },
});
