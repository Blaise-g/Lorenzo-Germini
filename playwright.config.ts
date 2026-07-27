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
    command: `bun run dev --port ${devServerPort}`,
    url: devServerUrl,
    /* Reuse is not a speed choice — it saves ~2.5s of a ~28s suite. It is forced
       by the `.next/dev/lock` per-directory lock: booting a second `next dev` for
       this repo fails outright, so a dev server you already have running must be
       reused rather than replaced. `globalSetup` confirms it is actually ours. */
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
