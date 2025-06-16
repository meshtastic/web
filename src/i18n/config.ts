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

/**
 * Generates a flag emoji from a two-letter country code.
 * @param regionCode - The two-letter, uppercase country code (e.g., "US", "FI").
 * @returns A string containing the flag emoji.
 */
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
  { code: "de-DE", name: "Deutschland", flag: getFlagEmoji("DE") },
  { code: "en-US", name: "English", flag: getFlagEmoji("US") },
  { code: "fi-FI", name: "Suomi", flag: getFlagEmoji("FI") },
  { code: "sv-SE", name: "Svenska", flag: getFlagEmoji("SE") },
];

i18next
  .use(Backend)
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    backend: {
      // With this setup, {{lng}} will correctly resolve to 'en-US', 'fi-FI', etc.
      loadPath: "/src/i18n/locales/{{lng}}/{{ns}}.json",
    },
    react: {
      useSuspense: true,
    },
    nonExplicitSupportedLngs: true,
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    fallbackLng: "en-US", // Default to US English if detection fails
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
