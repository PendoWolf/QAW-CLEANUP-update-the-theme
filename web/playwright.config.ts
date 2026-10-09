import { defineConfig, devices } from "@playwright/test";

// BASE_URL points tests at whatever environment is under test:
// local Vite dev server by default, or a deployed/preview URL for QAWolf.
const baseURL = process.env.BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Auto-starts the app locally. Remove/disable when testing a deployed URL.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        cwd: "..",
        url: "http://localhost:5173",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
