import { defineProject } from "vitest/config";

/**
 * Browser-mode tests for the OPFS-backed SQLite path.
 *
 * Runs separately from the Node `vitest run` so CI can opt in (and the
 * Playwright browser binary download isn't a hard requirement for the
 * fast unit-test loop).
 *
 * Run with:
 *   pnpm --filter @meshtastic/sdk-storage-sqlocal test:browser
 *
 * Requires `@vitest/browser` + Playwright. Install with:
 *   pnpm add -D -w @vitest/browser playwright
 */
export default defineProject({
  test: {
    name: "@meshtastic/sdk-storage-sqlocal:browser",
    include: ["src/**/*.browser.test.ts", "tests/**/*.browser.test.ts"],
    browser: {
      enabled: true,
      provider: "playwright",
      headless: true,
      instances: [{ browser: "chromium" }],
    },
  },
});
