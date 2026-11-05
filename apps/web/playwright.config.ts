import { defineConfig, devices } from "@playwright/test";

/** Its own port, never reused: a dev server left running from another checkout would be captured instead. */
const port = 5174;

export default defineConfig({
  testDir: "playwright",
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: {
    ...devices["Pixel 7"],
    baseURL: `http://localhost:${port}`,
  },
  projects: [
    { name: "smoke", testMatch: "smoke.pw.ts" },
    {
      name: "qa",
      testMatch: "qa-capture.pw.ts",
      use: { video: { mode: "on", size: devices["Pixel 7"].viewport } },
    },
  ],
  /** A build, so the service worker runs as in production; a development build keeps the seed. */
  webServer: {
    command: `pnpm exec vite build --outDir dist-playwright && pnpm exec vite preview --outDir dist-playwright --port ${port} --strictPort`,
    // An API that never answers: the QA captures stand in for it to open the app as the invite.
    env: { NODE_ENV: "development", VITE_API_URL: "http://api.qa.test" },
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
  },
});
