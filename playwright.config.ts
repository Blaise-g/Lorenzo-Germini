import { defineConfig, devices } from "@playwright/test";

import { devServerPort, devServerUrl } from "./tests/support/dev-server";

export default defineConfig({
  testDir: "./tests",
  outputDir: "node_modules/.cache/playwright-test",
  fullyParallel: true,
  globalSetup: "./tests/support/verify-dev-server.ts",
  use: {
    baseURL: devServerUrl,
    contextOptions: {
      reducedMotion: "reduce",
    },
    trace: "retain-on-failure",
  },
  webServer: {
    /* No `--port`: the dev script reads `PLAYWRIGHT_PORT` itself, so both sides
       land on the same port without passing the flag twice. */
    command: "bun run dev",
    url: devServerUrl,
    /* Forced by the `.next/dev/lock` constraint in tests/support/dev-server.ts,
       not a speed choice — reuse saves only ~2.5s of a ~28s suite. */
    reuseExistingServer: true,
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
