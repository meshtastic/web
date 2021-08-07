module.exports = {
  mode: 'jit',
  purge: ['./public/**/*.html', './src/**/*.tsx'],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    fontFamily: {
      sans: 'Inter var',
      mono: 'IBM Plex Mono',
    },
    extend: {
      colors: {
        primary: '#67ea94',
        primaryDark: '#1E293B',
        secondaryDark: '#0F172A',
      },
    },
  },
  variants: {},
  plugins: [],
};
