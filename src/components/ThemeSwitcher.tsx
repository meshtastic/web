import { useTheme } from "../core/hooks/useTheme.ts";
import { cn } from "../core/utils/cn.ts";
import { Monitor, Moon, Sun } from "lucide-react";

type ThemePreference = "light" | "dark" | "system";

export default function ThemeSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { preference, setPreference } = useTheme();

  const themeIcons = {
    light: <Sun className="size-6" />,
    dark: <Moon className="size-6" />,
    system: <Monitor className="size-6" />,
  };

  const toggleTheme = () => {
    const preferences: ThemePreference[] = ["light", "dark", "system"];
    const currentIndex = preferences.indexOf(preference);
    const nextPreference = preferences[(currentIndex + 1) % preferences.length];
    setPreference(nextPreference);
  };

  const [firstCharOfPreference = "", ...restOfPreference] = preference;

  return (
    <button
      type="button"
      className={cn(
        "transition-all duration-300 scale-100 cursor-pointer m-3 p-2 focus:*:data-label:opacity-100",
        className,
      )}
      onClick={toggleTheme}
      aria-description="Change current theme"
    >
      <span
        data-label
        className="transition-all block absolute w-full mb-auto mt-auto ml-0 mr-0 text-xs left-0 -top-3 opacity-0 rounded-lg"
      >
        {firstCharOfPreference.toLocaleUpperCase() +
          (restOfPreference ?? []).join("")}
      </span>
      {themeIcons[preference]}
    </button>
  );
}
