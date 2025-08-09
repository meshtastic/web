import { execSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";

let hash = "";
let version = "v0.0.0";
try {
  hash = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
} catch (error) {
  console.error("Error getting git hash:", error);
  hash = "DEV";
}

try {
  version = execSync("git describe --tags --abbrev=0", {
    encoding: "utf8",
  }).trim();
} catch (error) {
  console.error("Error getting git version:", error);
}

const CONTENT_SECURITY_POLICY =
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn-cookieyes.com; style-src 'self' 'unsafe-inline' data: https://rsms.me https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' data: https://rsms.me https://cdn.jsdelivr.net; worker-src 'self' blob:; object-src 'none'; base-uri 'self';";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const isProd = mode === "production";
  const isTest = env.VITE_IS_TEST;

  return {
    plugins: [
      react(),
      tailwindcss(),
      // This is for GDPR/CCPA compliance
      createHtmlPlugin({
        inject: {
          data: {
            title: isTest ? "Meshtastic Web (TEST)" : "Meshtastic Web",
            cookieYesScript:
              isProd && env.VITE_COOKIEYES_CLIENT_ID
                ? `<script async src="https://cdn-cookieyes.com/client_data/${env.VITE_COOKIEYES_CLIENT_ID}/script.js"></script>`
                : "",
          },
        },
      }),
      // VitePWA({
      //   registerType: "autoUpdate",
      //   strategies: "generateSW",
      //   devOptions: {
      //     enabled: true,
      //   },
      //   workbox: {
      //     cleanupOutdatedCaches: true,
      //     sourcemap: true,
      //   },
      // }),
    ],
    optimizeDeps: {
      include: ["react/jsx-runtime"],
    },
    define: {
      "import.meta.env.VITE_COMMIT_HASH": JSON.stringify(hash),
      "import.meta.env.VITE_VERSION": JSON.stringify(version),
    },
    build: {
      emptyOutDir: true,
      assetsDir: "./",
    },
    resolve: {
      alias: {
        "@app": path.resolve(process.cwd(), "./src"),
        "@pages": path.resolve(process.cwd(), "./src/pages"),
        "@components": path.resolve(process.cwd(), "./src/components"),
        "@core": path.resolve(process.cwd(), "./src/core"),
        "@layouts": path.resolve(process.cwd(), "./src/layouts"),
      },
    },
    server: {
      port: 3000,
      headers: {
        "content-security-policy": CONTENT_SECURITY_POLICY,
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "credentialless",
        "X-Content-Type-Options": "nosniff",
        "Strict-Transport-Security":
          "max-age=63072000; includeSubDomains; preload",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    },
  };
});
