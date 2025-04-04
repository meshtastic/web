import path from "node:path";
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config'

import { enableMapSet } from "immer";
enableMapSet();
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@app': path.resolve(process.cwd(), './src'),
      '@core': path.resolve(process.cwd(), './src/core'),
      '@pages': path.resolve(process.cwd(), './src/pages'),
      '@components': path.resolve(process.cwd(), './src/components'),
      '@layouts': path.resolve(process.cwd(), './src/layouts'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    root: path.resolve(process.cwd(), './src'),
    include: ['**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ["./src/tests/setupTests.ts"],
  },
})