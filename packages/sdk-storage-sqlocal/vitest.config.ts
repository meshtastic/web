import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@meshtastic/sdk-storage-sqlocal",
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Browser-mode tests run via vitest.browser.config.ts so they don't
    // execute under the Node runner where OPFS is unavailable.
    exclude: ["**/*.browser.test.ts", "**/node_modules/**"],
  },
});
