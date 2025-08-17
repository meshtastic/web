import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { enableMapSet } from "immer";
import { defineProject } from "vitest/config";

enableMapSet();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgRoot = __dirname;
const srcDir = path.resolve(pkgRoot, "src");
const publicDir = path.resolve(pkgRoot, "public");

export default defineProject({
  plugins: [react()],
  resolve: {
    alias: {
      "@app": srcDir,
      "@public": publicDir,
      "@core": path.resolve(srcDir, "core"),
      "@pages": path.resolve(srcDir, "pages"),
      "@components": path.resolve(srcDir, "components"),
      "@layouts": path.resolve(srcDir, "layouts"),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: [path.resolve(srcDir, "tests/setup.ts")],
  },
});
