import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

export type Lang = {
  code: Intl.Locale["language"];
  name: string;
  flag: string;
};

export type LangCode = Lang["code"];

function getFlagEmoji(regionCode: string): string {
  const A_LETTER_CODE = 0x1F1E6;
  const a_char_code = "A".charCodeAt(0);
  const codePoints = regionCode
    .toUpperCase()
    .split("")
    .map((char) => A_LETTER_CODE + char.charCodeAt(0) - a_char_code);
  return String.fromCodePoint(...codePoints);
}

export const supportedLanguages: Lang[] = [
  { code: "de", name: "German", flag: getFlagEmoji("de") },
  { code: "en", name: "English", flag: getFlagEmoji("us") },
  { code: "fi", name: "Finnish", flag: getFlagEmoji("fi") },
  { code: "sv", name: "Swedish", flag: getFlagEmoji("se") },
];

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
      "default": ["en"],
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
