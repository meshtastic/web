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
      "@layouts": path.resolve(srcDir, "layouts"),
      "@db": path.resolve(srcDir, "db"),
      "@validation": path.resolve(srcDir, "validation"),
      "@shared": path.resolve(srcDir, "shared"),
      "@features": path.resolve(srcDir, "features"),
      "@state": path.resolve(srcDir, "state"),
      "@data": path.resolve(srcDir, "data"),
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
