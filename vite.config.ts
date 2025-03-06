import { defineConfig } from "vite";
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';
import path from "node:path";

let hash = '';
try {
  hash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  console.error('Error getting git hash:', error);
  hash = 'DEV';
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      devOptions: {
        enabled: false
      },
      workbox: {
        cleanupOutdatedCaches: true,
        sourcemap: true
      }
    })
  ],
  define: {
    'import.meta.env.VITE_COMMIT_HASH': JSON.stringify(hash),
  },
  resolve: {
    alias: {
      // Using Node's path and process.cwd() instead of Deno.cwd()
      '@app': path.resolve(process.cwd(), './src'),
      '@pages': path.resolve(process.cwd(), './src/pages'),
      '@components': path.resolve(process.cwd(), './src/components'),
      '@core': path.resolve(process.cwd(), './src/core'),
      '@layouts': path.resolve(process.cwd(), './src/layouts'),
    },
  },
  server: {
    port: 3000
  },
  optimizeDeps: {
    exclude: ['react-scan']
  },
});