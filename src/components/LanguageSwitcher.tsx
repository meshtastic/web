import clsx from "clsx";
import { useTranslation } from "react-i18next";
import useLang from "@core/hooks/useLang.ts";
import { Button } from "./UI/Button.tsx";
import { supportedLanguages } from "../i18n/config.ts";
import { DropdownMenu, DropdownMenuContent } from "./UI/DropdownMenu.tsx";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";

function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const { set } = useLang();

  return (
    <DropdownMenu
      i18nIsDynamicList
      data-testid="language-list"
    >
      <DropdownMenuTrigger>asdlkfj</DropdownMenuTrigger>
      <DropdownMenuContent className="flex border border-b-2 border-b-gray-700 flex-col w-full items-stretch gap-1">
        {supportedLanguages?.map((lang) => (
          <li
            key={lang.code}
            className="list-none w-full"
            data-testid={`language-item-${lang.code}`}
          >
            <Button
              role="presentation"
              className={clsx([
                "flex flex-row justify-between items-center w-full",
                "rounded-lg px-3 py-1 transition duration-75 cursor-default",
              ])}
              onClick={() => set(lang.code)}
              data-testid={`language-button-${lang.code}`}
              data-selected={i18n.language === lang.code}
            >
              <div
                className="flex flex-row items-center m-1 gap-3 p-1 overflow-hidden"
                data-testid={`language-name-${lang.code}`}
              >
                {lang.name}
              </div>
              <div
                className={clsx([
                  "pr-4 ml-2 flex items-center font-medium text-xs",
                  "text-iron dark:text-bombay",
                ])}
                data-testid={`language-selected-indicator-${lang.code}`}
              >
                {i18n.language === lang.code &&
                  t("selected", { ns: "glossary" })}
              </div>
            </Button>
          </li>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcher;
