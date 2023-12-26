import { execSync } from "child_process";
import { resolve } from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import EnvironmentPlugin from "vite-plugin-environment";

import react from "@vitejs/plugin-react";

let hash = "";

try {
  hash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (error) {
  hash = "DEVELOPMENT";
}

export default defineConfig({
  plugins: [
    react(),
    EnvironmentPlugin({
      COMMIT_HASH: hash,
    }),
    // VitePWA({
    //   registerType: "autoUpdate",
    //   devOptions: {
    //     enabled: true
    //   }
    // })
  ],
  build: {
    target: "esnext",
    assetsDir: "",
    rollupOptions: {
      plugins: [visualizer()],
    },
  },
  resolve: {
    alias: {
      "@app": resolve(__dirname, "./src"),
      "@pages": resolve(__dirname, "./src/pages"),
      "@components": resolve(__dirname, "./src/components"),
      "@core": resolve(__dirname, "./src/core"),
      "@layouts": resolve(__dirname, "./src/layouts"),
    },
  },
});
