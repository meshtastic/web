import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

export type Lang = {
  code: Intl.Locale["language"];
  name: string;
  flag: string;
  region?: Intl.Locale["region"];
};

export type LangCode = Lang["code"];

export const supportedLanguages: Lang[] = [
  { code: "fi", name: "Suomi", flag: "🇫🇮" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
];

export const FALLBACK_LANGUAGE_CODE: LangCode = "en";

i18next
  .use(Backend)
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    backend: {
      // Use base language code (e.g., 'en' instead of 'en-GB') to avoid 404s
      loadPath: (lngs: string[], _ns: string) => {
        const lng = lngs[0] ?? FALLBACK_LANGUAGE_CODE;
        // Extract base language code (e.g., 'en' from 'en-GB')
        const baseLng = lng.split('-')[0];
        return `/i18n/locales/${baseLng}/{{ns}}.json`;
      },
    },
    react: {
      useSuspense: true,
    },
    nonExplicitSupportedLngs: true,
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    fallbackLng: {
      default: [FALLBACK_LANGUAGE_CODE],
      en: ["en", FALLBACK_LANGUAGE_CODE],
      fi: ["fi", "fi-FI", FALLBACK_LANGUAGE_CODE],
      fr: ["fr", "fr-FR", FALLBACK_LANGUAGE_CODE],
      sv: ["sv", "sv-SE", FALLBACK_LANGUAGE_CODE],
      de: ["de", "de-DE", FALLBACK_LANGUAGE_CODE],
    },
    fallbackNS: ["common", "ui", "dialog"],
    debug: import.meta.env.MODE === "development",
    ns: [
      "channels",
      "connections",
      "common",
      "config",
      "moduleConfig",
      "dialog",
      "messages",
      "nodes",
      "ui",
      "map",
    ],
  });
