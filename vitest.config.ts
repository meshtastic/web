import path from "node:path";
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@app': path.resolve(process.cwd(), './src'),
      '@pages': path.resolve(process.cwd(), './src/pages'),
      '@components': path.resolve(process.cwd(), './src/components'),
      '@core': path.resolve(process.cwd(), './src/core'),
      '@layouts': path.resolve(process.cwd(), './src/layouts'),
    },
  },
  test: {
    globals: true,
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    setupFiles: ['src/tests/setupTests.ts'],
    environment: 'jsdom',
  },
})