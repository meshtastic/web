import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

export type Lang = { code: string; name: string; flag: string };
export type LangCode = Lang["code"];

export const supportedLanguages: Lang[] = [
  // { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "en", name: "English", flag: "🇺🇸" },
  // { code: "es", name: "Español", flag: "🇪🇸" },
  // { code: "fr", name: "Français", flag: "🇫🇷" },
  // { code: "zh", name: "中文", flag: "🇨🇳" },
];

i18next
  .use(Backend)
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    backend: {
      // this will lazy load resources from the i8n folder
      loadPath: "/src/i18n/locales/{{lng}}/{{ns}}.json",
    },
    react: {
      useSuspense: true,
    },
    detection: {
      order: ["navigator", "localStorage"],
    },
    fallbackLng: {
      "en-US": ["en"],
      "en-CA": ["en-US", "en"],
      "default": ["en"],
    },
    fallbackNS: ["common", "ui", "dialog"],
    debug: import.meta.env.DEV,
    supportedLngs: supportedLanguages?.map((lang) => lang.code),
    ns: [
      "channels",
      "commandPalette",
      "common",
      "deviceConfig",
      "configModules",
      "dashboard",
      "dialog",
      "messages",
      "nodes",
      "ui",
    ],
  });
