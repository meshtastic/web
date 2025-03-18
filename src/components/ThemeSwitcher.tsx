import { useState } from "react";
import { useTheme } from "../core/hooks/useTheme.ts";
import { cn } from "../core/utils/cn.ts";
import { Monitor, Moon, Sun } from "lucide-react";

type ThemePreference = "light" | "dark" | "system";

export default function ThemeSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { theme, preference, setPreference } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const themeIcons = {
    light: <Sun className="size-5" />,
    dark: <Moon className="size-5" />,
    system: <Monitor className="size-5" />,
  };

  const toggleTheme = () => {
    const preferences: ThemePreference[] = ["light", "dark", "system"];
    const currentIndex = preferences.indexOf(preference);
    const nextPreference = preferences[(currentIndex + 1) % preferences.length];
    setPreference(nextPreference);
  };

  const labelStyle = {
    display: "block",
    margin: "0 auto",
    fontSize: ".65rem",
    width: "100%",
    position: "absolute",
    top: isFocused ? "-2em" : "2em",
    left: "0",
    opacity: isFocused ? "100" : "0"
  };

  return (
    <button
      type="button"
      className={cn(
        "transition-all duration-300 scale-100 cursor-pointer m-6 p-2",
        className,
      )}
      onClick={toggleTheme}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      aria-description={'Current theme'}
    >
      <span style={labelStyle}>{preference}</span>
      {themeIcons[preference]}
    </button>
  );
}
