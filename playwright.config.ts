import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3000",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    // The app is already built by the CI step before this runs — `npm run
    // start` (next start) just serves the existing build, no rebuild here.
    command: "npm run start",
    url: "http://localhost:3000",
    // Locally, developers already have `docker compose`'s dev server
    // running on :3000 (see README.md) — reuse it instead of starting a
    // second one. In CI there's nothing running yet, so always start fresh.
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
