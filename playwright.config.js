import { defineConfig } from "@playwright/test";

// Robot-kid smoke matrix (e2e/). Runs against the Vite dev server — DEV builds
// expose the window.__kidmathQA hooks the drivers need; a production build
// strips them, so this suite is dev-server-only by design.
export default defineConfig({
  testDir: "./e2e",
  timeout: 150_000,
  fullyParallel: true,
  workers: process.env.CI ? 4 : 6,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
