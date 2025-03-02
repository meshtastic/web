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

  return (
    <button
      type="button"
      className={cn(
        "transition-all duration-300 scale-100 cursor-pointer m-6 p-2",
        className,
      )}
      onClick={toggleTheme}
      aria-label={preference === "system"
        ? `System theme (currently ${theme}). Click to change theme.`
        : `Current theme: ${theme}. Click to change theme.`}
    >
      {themeIcons[preference]}
    </button>
  );
}
