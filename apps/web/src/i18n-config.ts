import i18next, { type InitOptions } from "i18next";
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
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
];

export const FALLBACK_LANGUAGE_CODE: LangCode = "en";

/**
 * The locale folders that are actually shipped in `public/i18n/locales/` (and
 * therefore in `dist/i18n/locales/` after a build).
 *
 * These are the only values that may ever be interpolated into the backend
 * `loadPath`, otherwise the request 404s.
 *
 * Note the deliberate asymmetry: the English *source* strings live in a plain
 * `en` folder because that is what `crowdin.yml` uploads
 * (`/public/i18n/locales/en/*.json`), while Crowdin writes every *translation*
 * back to a region qualified `%locale%` folder (`cs-CZ`, `pt-BR`, ...). So `en`
 * has no region suffix while every other locale does.
 *
 * Keep this list in sync with the directory listing — `i18n-config.test.ts`
 * fails if it drifts.
 */
export const availableLocales = [
  "be-BY",
  "bg-BG",
  "cs-CZ",
  "de-DE",
  "en",
  "es-ES",
  "fi-FI",
  "fr-FR",
  "hu-HU",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "nl-NL",
  "pl-PL",
  "pt-BR",
  "pt-PT",
  "ru-RU",
  "sv-SE",
  "tr-TR",
  "uk-UA",
  "zh-CN",
  "zh-TW",
] as const satisfies readonly string[];

export type AvailableLocale = (typeof availableLocales)[number];

export const getLanguagePart = (locale: string): string =>
  locale.split("-")[0] ?? locale;

/**
 * Builds the i18next `fallbackLng` map from the locales we actually ship.
 *
 * A bare language code (`de`, which is what the language picker stores, or a
 * browser reporting just `cs`) has no folder of its own, so it has to fall back
 * to the regional folder that does exist (`de-DE`, `cs-CZ`) and then to the
 * English source locale.
 *
 * Language codes that already have their own folder (`en`) and languages that
 * ship more than one regional variant (`pt` -> pt-BR/pt-PT, `zh` -> zh-CN/zh-TW)
 * are intentionally left out: i18next's own `supportedLngs` prefix matching
 * picks the first shipped variant for those, and adding a map entry would make
 * every pt-PT/zh-TW user download the other dialect as an intermediate fallback.
 */
export function buildLocaleFallbacks(
  locales: readonly string[] = availableLocales,
  fallbackLocale: string = FALLBACK_LANGUAGE_CODE,
): Record<string, string[]> {
  const fallbacks: Record<string, string[]> = {
    default: [fallbackLocale],
  };

  const variantsPerLanguage = new Map<string, string[]>();
  for (const locale of locales) {
    const languagePart = getLanguagePart(locale);
    variantsPerLanguage.set(languagePart, [
      ...(variantsPerLanguage.get(languagePart) ?? []),
      locale,
    ]);
  }

  for (const [languagePart, variants] of variantsPerLanguage) {
    const [onlyVariant] = variants;
    // Ambiguous (pt-BR/pt-PT) or already a bare folder (en) — leave to i18next.
    if (variants.length !== 1 || !onlyVariant || onlyVariant === languagePart) {
      continue;
    }
    fallbacks[languagePart] = [onlyVariant, fallbackLocale];
  }

  return fallbacks;
}

export const LOAD_PATH = "/i18n/locales/{{lng}}/{{ns}}.json";

export const namespaces = [
  "channels",
  "connections",
  "commandPalette",
  "common",
  "config",
  "moduleConfig",
  "dialog",
  "messages",
  "nodes",
  "ui",
  "map",
];

export const i18nOptions: InitOptions = {
  backend: {
    // `{{lng}}` is interpolated verbatim, so it must always be one of
    // `availableLocales`. `supportedLngs` below guarantees that: an unshipped
    // code such as `en-US` is dropped from the resolution hierarchy and
    // narrowed to the folder that does exist (`en`) instead of being requested
    // and 404ing.
    loadPath: LOAD_PATH,
  },
  react: {
    useSuspense: true,
  },
  supportedLngs: [...availableLocales],
  // Must stay false: when true, i18next treats `en-US` as supported because
  // `en` is, and then still requests `/i18n/locales/en-US/*.json`, which does
  // not exist on disk.
  nonExplicitSupportedLngs: false,
  detection: {
    order: ["localStorage", "navigator"],
    caches: ["localStorage"],
  },
  fallbackLng: buildLocaleFallbacks(),
  fallbackNS: ["common", "ui", "dialog"],
  ns: namespaces,
};

i18next
  .use(Backend)
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    ...i18nOptions,
    debug: import.meta.env.MODE === "development",
  });
