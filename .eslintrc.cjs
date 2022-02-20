module.exports = {
  extends: '@meshtastic/eslint-config',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
};
