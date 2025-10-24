import type { LangCode } from "@app/i18n-config.ts";
import useLang from "@core/hooks/useLang.ts";
import { cn } from "@core/utils/cn.ts";
import { Check, Languages } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./UI/Button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./UI/DropdownMenu.tsx";
import { Subtle } from "./UI/Typography/Subtle.tsx";

interface LanguageSwitcherProps {
  disableHover?: boolean;
}

export default function LanguageSwitcher({
  disableHover = false,
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation("ui");
  const { set: setLanguage, current, getSupportedLangs } = useLang();

  const handleLanguageChange = useCallback(
    async (languageCode: LangCode) => {
      await setLanguage(languageCode, true);
    },
    [setLanguage],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "group flex items-center justify-start",
            "transition-colors duration-150 gap-2.5 p-1.5 rounded-md",
            !disableHover && "hover:bg-gray-100 dark:hover:bg-gray-700",
          )}
        >
          <Languages
            size={16}
            className={cn(
              "text-gray-500 dark:text-gray-400 w-4 flex-shrink-0 transition-colors duration-150",
              !disableHover &&
                "group-hover:text-gray-700 dark:group-hover:text-gray-200",
            )}
          />
          <Subtle
            className={cn(
              "text-sm text-gray-600 dark:text-gray-100 transition-colors duration-150",
              !disableHover &&
                "group-hover:text-gray-800 dark:group-hover:text-gray-100",
            )}
          >
            {`${i18n.t("language.changeLanguage")}:`}
          </Subtle>
          <Subtle
            className={cn(
              "text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors duration-150",
              !disableHover &&
                "group-hover:text-gray-900 dark:group-hover:text-white",
            )}
          >
            {current?.name}
          </Subtle>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48">
        {getSupportedLangs.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>{language.flag}</span>
              <span>{language.name}</span>
            </div>
            {i18n.language === language.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
