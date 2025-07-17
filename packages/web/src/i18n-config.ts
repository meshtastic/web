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
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fi", name: "Suomi", flag: "🇫🇮" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
];

export const FALLBACK_LANGUAGE_CODE: LangCode = "en";

i18next
  .use(Backend)
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    backend: {
      // With this setup, {{lng}} will correctly resolve to 'en-US', 'fi-FI', etc.
      loadPath: "/i18n/locales/{{lng}}/{{ns}}.json",
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
      "en-GB": [FALLBACK_LANGUAGE_CODE],
      fi: ["fi-FI", FALLBACK_LANGUAGE_CODE],
      sv: ["sv-SE", FALLBACK_LANGUAGE_CODE],
      de: ["de-DE", FALLBACK_LANGUAGE_CODE],
    },
    fallbackNS: ["common", "ui", "dialog"],
    debug: import.meta.env.MODE === "development",
    ns: [
      "channels",
      "commandPalette",
      "common",
      "deviceConfig",
      "moduleConfig",
      "dashboard",
      "dialog",
      "messages",
      "nodes",
      "ui",
    ],
  });
