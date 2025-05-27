import { Check, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LangCode, supportedLanguages } from "../i18n/config.ts";
import useLang from "@core/hooks/useLang.ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./UI/DropdownMenu.tsx";
import { Subtle } from "./UI/Typography/Subtle.tsx";
import { cn } from "@core/utils/cn.ts";
import { Button } from "./UI/Button.tsx";

interface LanguageSwitcherProps {
  disableHover?: boolean;
}

export default function LanguageSwitcher(
  { disableHover = false }: LanguageSwitcherProps,
) {
  const { i18n } = useTranslation("ui");
  const { set: setLanguage } = useLang();

  const currentLanguage =
    supportedLanguages.find((lang) => lang.code === i18n.language) ||
    supportedLanguages[0];

  const handleLanguageChange = async (languageCode: LangCode) => {
    await setLanguage(languageCode, true);
  };

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
            {currentLanguage.code.toUpperCase()}
          </Subtle>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        {supportedLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code as LangCode)}
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
