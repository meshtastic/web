module.exports = {
  mode: 'jit',
  purge: ['./public/**/*.html', './src/**/*.tsx'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    fontFamily: {
      sans: 'Inter var',
      mono: 'IBM Plex Mono',
    },
    extend: {
      colors: {
        primary: '#67ea94',
      },
    },
  },
  variants: {},
  plugins: [],
};
