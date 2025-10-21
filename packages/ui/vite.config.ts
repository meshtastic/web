import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      entryRoot: "src",
      outDir: "dist",
      insertTypesEntry: true,
      copyDtsFiles: true,
    }),
    viteStaticCopy({
      targets: [
        {
          src: "src/lib/theme/default.css",
          dest: "theme",
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: "src/index.ts",
      name: "MeshtasticUI",
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "tailwindcss",
        "class-variance-authority",
        "tailwind-merge",
        "@radix-ui/react-slot",
      ],
    },
    sourcemap: true,
    target: "es2021",
  },
});
