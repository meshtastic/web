import {
  FALLBACK_LANGUAGE_CODE,
  type Lang,
  type LangCode,
  supportedLanguages,
} from "@app/i18n-config.ts";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useLocalStorage from "./useLocalStorage.ts";

const STORAGE_KEY = "language";

type LanguageState = {
  language: LangCode;
};

function useLang() {
  const { i18n } = useTranslation();
  const [_, setLanguageInStorage] = useLocalStorage<LanguageState | null>(
    STORAGE_KEY,
    null,
  );

  const currentLanguage = useMemo((): Lang | undefined => {
    const lang = supportedLanguages.find((l) => l.code === i18n.language);
    if (lang) {
      return lang;
    }
    return supportedLanguages.find((l) => l.code === FALLBACK_LANGUAGE_CODE);
  }, [i18n.language]);

  const collator = useMemo(() => {
    return new Intl.Collator(i18n.language, { sensitivity: "base" });
  }, [i18n.language]);

  const set = useCallback(
    async (lng: LangCode, persist = true) => {
      if (i18n.language === lng) {
        return;
      }
      try {
        if (persist) {
          setLanguageInStorage({ language: lng });
        }
        await i18n.changeLanguage(lng);
      } catch (e) {
        console.warn("Failed to change language:", e);
      }
    },
    [i18n.language, i18n.changeLanguage, setLanguageInStorage],
  );

  const getSupportedLangs = useMemo(
    () => supportedLanguages.toSorted((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const compare = useCallback(
    (a: string, b: string) => {
      return collator.compare(a, b);
    },
    [collator],
  );

  return { compare, set, current: currentLanguage, getSupportedLangs };
}

export default useLang;
