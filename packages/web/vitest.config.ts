import path from "node:path";
import process from "node:process";
import react from "@vitejs/plugin-react";
import { enableMapSet } from "immer";
import { defineProject } from "vitest/config";

enableMapSet();
export default defineProject({
  plugins: [react()],
  resolve: {
    alias: {
      "@app": path.resolve(process.cwd(), "./packages/web/src"),
      "@public": path.resolve(process.cwd(), "./packages/web/public"),
      "@core": path.resolve(process.cwd(), "./packages/web/src/core"),
      "@pages": path.resolve(process.cwd(), "./packages/web/src/pages"),
      "@components": path.resolve(
        process.cwd(),
        "./packages/web/src/components",
      ),
      "@layouts": path.resolve(process.cwd(), "./packages/web/src/layouts"),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    root: path.resolve(process.cwd(), "./packages/web/src"),
    include: ["**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/tests/setup.ts"],
  },
});
