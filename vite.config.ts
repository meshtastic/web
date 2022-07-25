import { execSync } from 'child_process';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import importToCDN from 'vite-plugin-cdn-import';
import EnvironmentPlugin from 'vite-plugin-environment';

import react from '@vitejs/plugin-react';

let hash = '';

try {
  hash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (error) {
  hash = 'DEVELOPMENT';
}

export default defineConfig({
  plugins: [
    react(),
    EnvironmentPlugin({
      COMMIT_HASH: hash,
    }),
    importToCDN({
      modules: [
        // {
        //   name: 'mapbox-gl',
        //   var: 'mapboxgl',
        //   path: `dist/mapbox-gl.js`,
        // },
        // autoComplete('@arcgis/core'),
      ],
    }),

    // VitePWA({
    //   mode: 'production',

    //   includeAssets: [
    //     'favicon.svg',
    //     'favicon.ico',
    //     'robots.txt',
    //     'touch-icon.png',
    //   ],
    //   manifest: {
    //     name: 'Meshtastic Web',
    //     short_name: 'Meshtastic',
    //     description: 'Meshtastic Web App',
    //     theme_color: '#67ea94',
    //     icons: [
    //       {
    //         src: 'android-192.png',
    //         sizes: '192x192',
    //         type: 'image/png',
    //       },
    //       {
    //         src: 'android-512.png',
    //         sizes: '512x512',
    //         type: 'image/png',
    //       },
    //       {
    //         src: 'android-512.png',
    //         sizes: '512x512',
    //         type: 'image/png',
    //         purpose: 'any maskable',
    //       },
    //     ],
    //   },
    //   workbox: {
    //     sourcemap: true,
    //   },
    // }),
  ],
  build: {
    target: 'esnext',
    assetsDir: '',
    rollupOptions: {
      plugins: [visualizer()],
    },
  },
  resolve: {
    alias: {
      '@app': resolve(__dirname, './src'),
      '@pages': resolve(__dirname, './src/pages'),
      '@components': resolve(__dirname, './src/components'),
      '@core': resolve(__dirname, './src/core'),
      '@layouts': resolve(__dirname, './src/layouts'),
    },
  },
});
