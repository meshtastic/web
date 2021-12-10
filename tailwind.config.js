const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./public/**/*.html', './src/**/*.tsx'],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    fontFamily: {
      sans: ['Inter var', ...defaultTheme.fontFamily.sans],
    },
    extend: {
      colors: {
        primary: '#67ea94',
        primaryDark: '#1E293B',
        secondaryDark: '#0F172A',
      },
      boxShadow: {
        border: '0 0 0 1px #67ea94',
      },
    },
  },
  variants: {},
  plugins: [],
};
