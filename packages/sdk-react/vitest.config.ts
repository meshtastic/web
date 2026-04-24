import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@meshtastic/sdk-react",
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
