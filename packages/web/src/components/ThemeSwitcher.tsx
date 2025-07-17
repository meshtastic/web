import { useTheme } from "@core/hooks/useTheme.ts";
import { cn } from "@core/utils/cn.ts";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./UI/Button.tsx";
import { Subtle } from "./UI/Typography/Subtle.tsx";

type ThemePreference = "light" | "dark" | "system";

interface ThemeSwitcherProps {
  className?: string;
  disableHover?: boolean;
}

export default function ThemeSwitcher({
  className: passedClassName = "",
  disableHover = false,
}: ThemeSwitcherProps) {
  const { preference, setPreference } = useTheme();
  const { t } = useTranslation("ui");

  const iconBaseClass =
    "size-4 flex-shrink-0 text-gray-500 dark:text-gray-400 transition-colors duration-150";
  const iconHoverClass = !disableHover
    ? "group-hover:text-gray-700 dark:group-hover:text-gray-200"
    : "";
  const combinedIconClass = cn(iconBaseClass, iconHoverClass);

  const themeIcons = {
    light: <Sun className={combinedIconClass} />,
    dark: <Moon className={combinedIconClass} />,
    system: <Monitor className={combinedIconClass} />,
  };

  const toggleTheme = () => {
    const preferences: ThemePreference[] = ["light", "dark", "system"];
    const currentIndex = preferences.indexOf(preference);
    const nextPreference = preferences[(currentIndex + 1) % preferences.length];
    setPreference(nextPreference);
  };

  const preferenceDisplayMap: Record<ThemePreference, string> = {
    light: t("theme.light"),
    dark: t("theme.dark"),
    system: t("theme.system"),
  };

  const currentDisplayPreference = preferenceDisplayMap[preference];

  return (
    <Button
      variant="ghost"
      onClick={toggleTheme}
      id="theme-switcher"
      aria-label={t("theme.changeTheme")}
      className={cn(
        "group relative flex justify-start",
        "gap-2.5 p-1.5 rounded-md transition-colors duration-150",
        "cursor-pointer",
        !disableHover && "hover:bg-gray-100 dark:hover:bg-gray-700",
        "focus:*:data-label:opacity-100",
        passedClassName,
      )}
    >
      <span
        data-label="theme-preference-tooltip"
        className={cn(
          "transition-opacity duration-150",
          "block absolute w-max max-w-xs",
          "p-1 text-xs text-white dark:text-black bg-black dark:bg-white",
          "rounded-md shadow-lg",
          "left-1/2 -translate-x-1/2 -top-8",
          "opacity-0",
        )}
      >
        {currentDisplayPreference}
      </span>

      {themeIcons[preference]}
      <Subtle
        className={cn(
          "text-sm",
          "text-gray-600 dark:text-gray-300",
          "transition-colors duration-150",
          !disableHover &&
            "group-hover:text-gray-800 dark:group-hover:text-gray-100",
        )}
      >
        {t("theme.changeTheme")}
      </Subtle>
    </Button>
  );
}
