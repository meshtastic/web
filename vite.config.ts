import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "@std/path/resolve";

let hash = "";
try {
  const command = new Deno.Command("git", {
    args: ["rev-parse", "--short", "HEAD"],
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await command.output();

  if (code === 0) {
    hash = new TextDecoder().decode(stdout).trim();
  } else {
    const errorOutput = new TextDecoder().decode(stderr);
    console.error("Error getting git hash:", errorOutput);
    hash = "DEV";
  }
} catch (error) {
  console.error("Failed to execute git command:", error);
  hash = "DEV";
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "generateSW",
      devOptions: {
        enabled: false,
      },
      workbox: {
        cleanupOutdatedCaches: true,
        sourcemap: true,
      },
    }),
  ],
  define: {
    "import.meta.env.VITE_COMMIT_HASH": JSON.stringify(hash),
  },
  build: {
    emptyOutDir: true,
    assetsDir: "./",
  },
  resolve: {
    alias: {
      "@app": resolve(Deno.cwd(), "./src"),
      "@pages": resolve(Deno.cwd(), "./src/pages"),
      "@components": resolve(Deno.cwd(), "./src/components"),
      "@core": resolve(Deno.cwd(), "./src/core"),
      "@layouts": resolve(Deno.cwd(), "./src/layouts"),
    },
  },
  server: {
    port: 3000,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
