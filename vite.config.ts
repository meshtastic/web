import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      mode: 'production',

      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'robots.txt',
        'touch-icon.png',
      ],
      manifest: {
        name: 'Meshtastic Web',
        short_name: 'Meshtastic',
        description: 'Meshtastic Web App',
        // theme_color: '#2C2D3C',
        theme_color: '#67ea94',
        icons: [
          {
            src: 'android-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'android-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'android-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        sourcemap: true,
      },
    }),
  ],
  build: {
    target: 'esnext',
    assetsDir: '',
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, './src'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@components': path.resolve(__dirname, './src/components'),
      '@core': path.resolve(__dirname, './src/core'),
    },
  },
});
