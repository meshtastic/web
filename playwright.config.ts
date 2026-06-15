import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end suite that drives the real web app against a REAL Meshtastic device
 * (a simulated `meshtasticd` node by default, or physical hardware) over the
 * HTTP(S) phone API, and exercises text messaging across a two-node mesh.
 *
 * Topology is brought up in e2e/global-setup.ts. The off-browser "mesh peer"
 * (e2e/peer/peer.py) drives/asserts the second node. See e2e/README.md.
 */
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3100);

export default defineConfig({
  testDir: "./e2e/tests",
  outputDir: "./e2e/.results",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  // Tests share a single two-node mesh + one device identity, so run serially.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },

  reporter: [["list"], ["html", { outputFolder: "e2e/.report", open: "never" }]],

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    // The device webserver uses a self-signed cert (TLS-only on 9443).
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Belt-and-suspenders for the device's self-signed cert.
        launchOptions: { args: ["--ignore-certificate-errors"] },
      },
    },
  ],

  webServer: {
    command: `pnpm --filter ./apps/web exec vite --port ${WEB_PORT} --strictPort`,
    url: `http://localhost:${WEB_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
