import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';
import path from 'path';

let hash = '';
try {
  hash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (error) {
  hash = 'DEV';
}

export default defineConfig({
  plugins: [react(),
  VitePWA({
    registerType: 'autoUpdate',
    strategies: 'generateSW',
    devOptions: {
      enabled: true
    },
    workbox: {
      cleanupOutdatedCaches: true,
      sourcemap: true
    }
  })
  ],
  define: {
    'process.env.COMMIT_HASH': JSON.stringify(hash),
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, './src'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@components': path.resolve(__dirname, './src/components'),
      '@core': path.resolve(__dirname, './src/core'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
    },
  },
  server: {
    port: 3000
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
  }
});