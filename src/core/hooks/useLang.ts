import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LangCode } from "@app/i18n/config.ts";
import useLocalStorage from "./useLocalStorage.ts";

/**
 * Hook to set the i18n language
 *
 * @returns The `set` function
 */
const STORAGE_KEY = "language";

type LanguageState = {
  language: string;
};
function useLang() {
  const { i18n } = useTranslation();
  const [_, setLanguage] = useLocalStorage<LanguageState | null>(
    STORAGE_KEY,
    null,
  );

  const regionNames = useMemo(() => {
    return new Intl.DisplayNames(i18n.language, {
      type: "region",
      fallback: "none",
      style: "long",
    });
  }, [i18n.language]);

  const collator = useMemo(() => {
    return new Intl.Collator(i18n.language, {});
  }, [i18n.language]);

  /**
   * Sets the i18n language.
   *
   * @param lng - The language tag to set
   */
  const set = useCallback(
    async (lng: LangCode, persist = true) => {
      if (i18n.language === lng) {
        return;
      }
      console.info("set language:", lng);
      if (persist) {
        try {
          setLanguage({ language: lng });
        } catch (e) {
          console.warn(e);
        }
        await i18n.changeLanguage(lng);
      }
    },
    [i18n],
  );

  /**
   * Get the localized country name
   *
   * @param code - Two-letter country code
   */
  const getCountryName = useCallback(
    (code: LangCode) => {
      let name = null;
      try {
        name = regionNames.of(code);
      } catch (e) {
        console.warn(e);
      }
      return name;
    },
    [regionNames],
  );

  /**
   * Compare two strings according to the sort order of the current language
   *
   * @param a - The first string to compare
   * @param b - The second string to compare
   */
  const compare = useCallback(
    (a: string, b: string) => {
      return collator.compare(a, b);
    },
    [collator],
  );

  return { compare, set, getCountryName };
}

export default useLang;
