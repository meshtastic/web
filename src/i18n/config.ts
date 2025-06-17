import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

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
      // this will lazy load resources from the i18n folder
      loadPath: "/src/i18n/locales/{{lng}}/{{ns}}.json",
    },
    react: {
      useSuspense: true,
    },
    detection: {
      order: ["navigator", "localStorage"],
      caches: ["localStorage"],
    },
    fallbackLng: {
      default: [FALLBACK_LANGUAGE_CODE],
      "en-GB": [FALLBACK_LANGUAGE_CODE],
      "fi": ["fi-FI"],
      "sv": ["sv-SE"],
      "de": ["de-DE"],
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
