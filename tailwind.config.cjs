const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["Cascadia Code", ...fontFamily.mono],
        sans: ["Inter var", ...fontFamily.sans],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      colors: {
        backgroundPrimary: "var(--backgroundPrimary)",
        backgroundSecondary: "var(--backgroundSecondary)",
        accent: "var(--accent)",
        accentMuted: "var(--accentMuted)",
        textPrimary: "var(--textPrimary)",
        textSecondary: "var(--textSecondary)",
        link: "var(--link)",
      },
      brightness: {
        hover: "var(--brighnessHover)",
        press: "var(--brightnessPress)",
        disabled: "var(--brightnessDisabled)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
