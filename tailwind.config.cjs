/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    fontFamily: {
      mono: [
        "Cascadia Code",
        "ui-monospace",
        "SFMono-Regular",
        "Menlo",
        "Monaco",
        "Consolas",
        "Liberation Mono",
        "Courier New",
        "monospace"
      ]
    },
    colors: {
      transparent: "transparent",
      current: "currentColor",
      backgroundPrimary: "var(--backgroundPrimary)",
      backgroundSecondary: "var(--backgroundSecondary)",
      accent: "var(--accent)",
      button: "var(--button)",
      textPrimary: "var(--textPrimary)",
      textSecondary: "var(--textSecondary)",
      link: "var(--link)",
    },
    brightness: {
      hover: "var(--brighnessHover)",
      press: "var(--brightnessPress)",
      disabled: "var(--brightnessDisabled)"
    },
    extend: {}
  },
  plugins: [require("@tailwindcss/forms")]
};
