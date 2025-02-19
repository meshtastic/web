import { useTheme } from "@app/core/hooks/useTheme";
import { Moon, Sun } from "lucide-react";
import React from "react";

type Theme = "light" | "dark";

export default function ThemeSwitcher({
  className = "",
}: { className?: string }) {
  const currentTheme = useTheme(); // Get current theme from DOM
  const [theme, setTheme] = React.useState<Theme>(currentTheme);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const themeIcons = {
    light: (
      <Sun className="size-5 transition-transform duration-300 scale-100" />
    ),
    dark: (
      <Moon className="size-5 transition-transform duration-300 scale-100" />
    ),
  };

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return (
    <button
      type="button"
      className={`transition-all duration-300 hover:text-accent ${className}`}
      onClick={toggleTheme}
      aria-label={`Current theme: ${theme}. Click to change theme.`}
    >
      {themeIcons[theme]}
    </button>
  );
}
