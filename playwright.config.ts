import { defineConfig, devices } from "@playwright/test";

const testPort = process.env.PLAYWRIGHT_PORT ?? "3000";
const testUrl = `http://localhost:${testPort}`;

export default defineConfig({
  testDir: "./tests",
  outputDir: "node_modules/.cache/playwright-test",
  fullyParallel: true,
  use: {
    baseURL: testUrl,
    contextOptions: {
      reducedMotion: "reduce",
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `bun run dev --port ${testPort}`,
    url: testUrl,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 800 },
      },
    },
  ],
});
