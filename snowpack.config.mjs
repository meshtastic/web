/** @type {import("snowpack").SnowpackUserConfig } */
export default {
  mount: {
    public: { url: '/' },
    src: { url: '/' },
  },
  plugins: [
    '@snowpack/plugin-react-refresh',
    '@snowpack/plugin-dotenv',
    '@snowpack/plugin-postcss',
    [
      '@snowpack/plugin-typescript',
      {
        /* Yarn PnP workaround: see https://www.npmjs.com/package/@snowpack/plugin-typescript */
        ...(process.versions.pnp ? { tsc: 'yarn pnpify tsc' } : {}),
      },
    ],
  ],
  alias: {
    // Type 1: Package Import Alias
    // "lodash": "lodash-es",
    // Type 2: Local Directory Import Alias (relative to cwd)
    '@app': './src',
    '@pages': './src/pages',
    '@components': './src/components',
    '@core': './src/core',
  },
  routes: [
    /* Enable an SPA Fallback in development: */
    // {"match": "routes", "src": ".*", "dest": "/index.html"},
  ],
  optimize: {
    /* Example: Bundle your final build: */
    bundle: true,
    sourcemap: false,
    splitting: true,
    treeshake: true,
    manifest: false,
    minify: true,
    target: 'es2020',
  },
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
};
