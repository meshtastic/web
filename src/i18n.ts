import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

export const supportedLngs = {
  en: "English",
};

i18next
  .use(Backend)
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    backend: {
      // this will lazy load resources from the i8n folder
      loadPath: "/src/i18n/locales/{{lng}}.json",
    },
    react: {
      useSuspense: true,
    },
    fallbackLng: "en",
    debug: !!import.meta.env.DEV,
    supportedLngs: Object.keys(supportedLngs),
    detection: {
      order: ["navigator", "localStorage"],
    },
  });
