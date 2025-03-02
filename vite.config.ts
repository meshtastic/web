import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

let hash = '';
try {
  const process = new Deno.Command('git', {
    args: ['rev-parse', '--short', 'HEAD'],
    stdout: 'piped'
  });
  const output = await process.output();
  hash = new TextDecoder().decode(output.stdout).trim();
} catch (error) {
  console.error('Error getting git hash:', error);
  hash = 'DEV';
}

console.log('Commit hash:', hash);

export default defineConfig({
  plugins: [
    react(),
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
    'import.meta.env.VITE_COMMIT_HASH': JSON.stringify(hash),
  },
  resolve: {
    alias: {
      '@app': path.resolve(Deno.cwd(), './src'),
      '@pages': path.resolve(Deno.cwd(), './src/pages'),
      '@components': path.resolve(Deno.cwd(), './src/components'),
      '@core': path.resolve(Deno.cwd(), './src/core'),
      '@layouts': path.resolve(Deno.cwd(), './src/layouts'),
    },
  },
  server: {
    port: 3000
  },
  optimizeDeps: {
    exclude: ['react-scan']
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
  }
});