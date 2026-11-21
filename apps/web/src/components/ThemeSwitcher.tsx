import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../core/hooks/useTheme.ts";
import { useToggleVisibility } from "../core/hooks/useToggleVisiblility.ts";
import { cn } from "../core/utils/cn.ts";
import { Button } from "./UI/Button.tsx";
import { Subtle } from "./UI/Typography/Subtle.tsx";

type ThemePreference = "light" | "dark" | "system";

interface ThemeSwitcherProps {
  className?: string;
  disableHover?: boolean;
}

const TOOLTIP_TIMEOUT = 2000; // 2 seconds

export default function ThemeSwitcher({
  className: passedClassName = "",
  disableHover = false,
}: ThemeSwitcherProps) {
  const [showTooltip, toggleShowTooltip] = useToggleVisibility({
    timeout: TOOLTIP_TIMEOUT,
  });

  const { preference, setPreference } = useTheme();
  const { t } = useTranslation("ui");

  const iconBaseClass =
    "size-4 flex-shrink-0 text-muted transition-colors duration-150";
  const iconHoverClass = !disableHover ? "group-hover:text-primary" : "";
  const combinedIconClass = cn(iconBaseClass, iconHoverClass);

  const themeIcons = {
    light: <Sun className={combinedIconClass} />,
    dark: <Moon className={combinedIconClass} />,
    system: <Monitor className={combinedIconClass} />,
  };

  const toggleTheme = () => {
    const preferences: ThemePreference[] = ["light", "dark", "system"];
    const currentIndex = preferences.indexOf(preference);
    const nextPreference =
      preferences[(currentIndex + 1) % preferences.length] ?? "system";
    setPreference(nextPreference);
    toggleShowTooltip();
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
      aria-label={t("theme.changeTheme")}
      className={cn(
        "group relative flex justify-start",
        "gap-2.5 p-1.5 rounded-md transition-colors duration-150",
        "cursor-pointer",
        !disableHover && "hover:bg-raised",
        "focus:*:data-label:opacity-100",
        passedClassName,
      )}
    >
      <span
        data-label="theme-preference-tooltip"
        className={cn(
          "transition-opacity duration-150 hidden",
          "block absolute w-max max-w-xs",
          "border border-elevated bg-raised px-2 py-1 text-meta text-primary",
          "rounded-md shadow-popover",
          "left-1/2 -translate-x-1/2 -top-8",
          showTooltip ? "visible" : "hidden opacity-0",
        )}
      >
        {currentDisplayPreference}
      </span>

      {themeIcons[preference]}
      <Subtle
        className={cn(
          "text-sm",
          "text-secondary",
          "transition-colors duration-150",
          !disableHover && "group-hover:text-primary",
        )}
      >
        {t("theme.changeTheme")}
      </Subtle>
    </Button>
  );
}
