import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "@meshtastic/ui",
    environment: "happy-dom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
