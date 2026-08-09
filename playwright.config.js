import { defineConfig } from "@playwright/test";

// Robot-kid smoke matrix (e2e/). Runs against the Vite dev server — DEV builds
// expose the window.__kidmathQA hooks the drivers need; a production build
// strips them, so this suite is dev-server-only by design.
//
// KIDMATH_E2E_PORT picks the port (default 5173). Set it when another
// checkout's dev server holds 5173 — `reuseExistingServer` will happily test
// WHATEVER is on the port, including a different branch's code (#32 was
// nearly verified against a stale server exactly this way). `--strictPort`
// keeps Vite from silently drifting to 5174 while baseURL still points here.
const PORT = Number(process.env.KIDMATH_E2E_PORT || 5173);

export default defineConfig({
  testDir: "./e2e",
  timeout: 150_000,
  fullyParallel: true,
  workers: process.env.CI ? 4 : 6,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
