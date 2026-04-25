import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@meshtastic/sdk-storage-sqlocal",
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
