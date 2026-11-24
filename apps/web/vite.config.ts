import { execSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

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
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://cdn-cookieyes.com; style-src 'self' 'unsafe-inline' data: https://rsms.me https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' data: https://rsms.me https://cdn.jsdelivr.net; worker-src 'self' blob:; object-src 'none'; base-uri 'self';";

/** Sets the page title and, when given a client ID, adds the CookieYes banner. */
function indexHtml(options: {
  title: string;
  cookieYesClientId?: string;
}): Plugin {
  return {
    name: "meshtastic:index-html",
    transformIndexHtml: (html) => ({
      html: html.replace(
        /<title>.*<\/title>/,
        `<title>${options.title}</title>`,
      ),
      tags: options.cookieYesClientId
        ? [
            // This is for GDPR/CCPA compliance
            {
              tag: "script",
              attrs: {
                async: true,
                src: `https://cdn-cookieyes.com/client_data/${options.cookieYesClientId}/script.js`,
              },
              injectTo: "head-prepend",
            },
          ]
        : [],
    }),
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const isProd = mode === "production";
  const isTest = env.VITE_IS_TEST;
  const useHTTPS = env.VITE_USE_HTTPS === "true";

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(useHTTPS ? [basicSsl()] : []),
      indexHtml({
        title: isTest
          ? "Meshtastic Web Client (TEST)"
          : "Meshtastic Web Client",
        cookieYesClientId: isProd ? env.VITE_COOKIEYES_CLIENT_ID : undefined,
      }),
      VitePWA({
        selfDestroying: true,
      }),
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
    // sqlocal ships an OPFS-backed Web Worker; rolldown only allows ES-format
    // workers when code-splitting is on (which Vite enables by default).
    worker: {
      format: "es",
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
        "Content-Security-Policy": CONTENT_SECURITY_POLICY,
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
