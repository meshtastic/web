const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./public/**/*.html', './src/**/*.tsx'],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    fontFamily: {
      sans: ['Inter var', ...defaultTheme.fontFamily.sans],
      mono: ['Cascadia Code', ...defaultTheme.fontFamily.mono],
    },
    extend: {
      colors: {
        primary: '#67ea94',
        primaryDark: '#25262C',
        secondaryDark: '#1C1D23',
        tertiaryDark: '#323438',
      },
      boxShadow: {
        border: '0 0 0 1px #67ea94',
      },
    },
  },
  variants: {},
  plugins: [],
};
