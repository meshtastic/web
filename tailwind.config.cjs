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
        // primaryDark: '#1E293B',
        primaryDark: '#25262C',
        // secondaryDark: '#0F172A',
        secondaryDark: '#1C1D23',
        accentDark: '25262C',
      },
      boxShadow: {
        border: '0 0 0 1px #67ea94',
      },
    },
  },
  variants: {},
  plugins: [],
};
