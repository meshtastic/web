import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  availableLocales,
  buildLocaleFallbacks,
  FALLBACK_LANGUAGE_CODE,
  i18nOptions,
  LOAD_PATH,
  namespaces,
  supportedLanguages,
} from "@app/i18n-config.ts";
import { createInstance, type BackendModule } from "i18next";
import { describe, expect, it } from "vitest";

const localesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/i18n/locales",
);

const localeFoldersOnDisk = () =>
  fs
    .readdirSync(localesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

const buildUrl = (lng: string, ns: string) =>
  LOAD_PATH.replace("{{lng}}", lng).replace("{{ns}}", ns);

const fileForRequest = (lng: string, ns: string) =>
  path.join(localesDir, lng, `${ns}.json`);

type Request = { url: string; lng: string; ns: string; status: 200 | 404 };

/**
 * Stands in for i18next-http-backend: resolves the very same `loadPath` the
 * browser would request, but against the files that are actually shipped in
 * `public/i18n/locales` (which is what ends up in `dist/i18n/locales`).
 */
const recordingBackend = (requests: Request[]): BackendModule => ({
  type: "backend",
  init: () => {},
  read: (lng, ns, callback) => {
    const file = fileForRequest(lng, ns);
    const exists = fs.existsSync(file);
    requests.push({
      url: buildUrl(lng, ns),
      lng,
      ns,
      status: exists ? 200 : 404,
    });
    if (exists) {
      callback(null, JSON.parse(fs.readFileSync(file, "utf8")));
      return;
    }
    callback(new Error("404"), false);
  },
});

async function loadWithDetectedLanguage(detected: string) {
  const requests: Request[] = [];
  const instance = createInstance();
  await instance.use(recordingBackend(requests)).init({
    ...i18nOptions,
    lng: detected,
    react: { useSuspense: false },
  });
  return { instance, requests };
}

describe("shipped locale folders", () => {
  it("availableLocales matches what is on disk", () => {
    expect([...availableLocales].sort()).toEqual(localeFoldersOnDisk());
  });

  it("ships the English source locale as a plain `en` folder (crowdin source)", () => {
    expect(availableLocales).toContain(FALLBACK_LANGUAGE_CODE);
    expect(availableLocales).not.toContain("en-US");
    for (const ns of namespaces) {
      expect(fs.existsSync(fileForRequest("en", ns))).toBe(true);
    }
  });

  it("only ever interpolates locales that exist on disk", () => {
    const configured = i18nOptions.supportedLngs as string[];
    expect([...configured].sort()).toEqual(localeFoldersOnDisk());
  });

  it("does not treat regional variants of a shipped language as supported", () => {
    // `nonExplicitSupportedLngs: true` is what made i18next request the
    // non-existent /i18n/locales/en-US/*.json paths.
    expect(i18nOptions.nonExplicitSupportedLngs).toBe(false);
  });
});

describe("buildLocaleFallbacks", () => {
  it("maps bare language codes onto the regional folder that ships", () => {
    const fallbacks = buildLocaleFallbacks();
    expect(fallbacks.default).toEqual([FALLBACK_LANGUAGE_CODE]);
    expect(fallbacks.fi).toEqual(["fi-FI", "en"]);
    expect(fallbacks.de).toEqual(["de-DE", "en"]);
    expect(fallbacks.fr).toEqual(["fr-FR", "en"]);
    expect(fallbacks.ru).toEqual(["ru-RU", "en"]);
    expect(fallbacks.sv).toEqual(["sv-SE", "en"]);
    expect(fallbacks.cs).toEqual(["cs-CZ", "en"]);
  });

  it("never maps a language onto a locale that is not shipped", () => {
    for (const chain of Object.values(buildLocaleFallbacks())) {
      for (const locale of chain) {
        expect(availableLocales as readonly string[]).toContain(locale);
      }
    }
  });

  it("leaves `en` and ambiguous multi-variant languages unmapped", () => {
    const fallbacks = buildLocaleFallbacks();
    expect(fallbacks.en).toBeUndefined();
    expect(fallbacks.pt).toBeUndefined();
    expect(fallbacks.zh).toBeUndefined();
  });

  it("every language offered in the picker resolves to a shipped folder", () => {
    const fallbacks = buildLocaleFallbacks();
    for (const { code } of supportedLanguages) {
      const resolvesTo = (availableLocales as readonly string[]).includes(code)
        ? code
        : fallbacks[code]?.[0];
      expect(
        resolvesTo,
        `no shipped locale for picker entry "${code}"`,
      ).toBeDefined();
      expect(fs.existsSync(path.join(localesDir, resolvesTo as string))).toBe(
        true,
      );
    }
  });
});

describe("locale request resolution (regression: en-US 404s)", () => {
  it("an en-US browser loads every namespace from the `en` folder, with no 404s", async () => {
    const { instance, requests } = await loadWithDetectedLanguage("en-US");

    expect(requests.filter((r) => r.status === 404)).toEqual([]);
    expect(requests.map((r) => r.url)).not.toContain(
      "/i18n/locales/en-US/common.json",
    );

    // Every namespace from the live bug report must now come from `en`.
    for (const ns of namespaces) {
      expect(requests).toContainEqual(
        expect.objectContaining({
          url: `/i18n/locales/en/${ns}.json`,
          status: 200,
        }),
      );
      expect(instance.hasResourceBundle("en", ns)).toBe(true);
    }

    expect(instance.resolvedLanguage).toBe("en");
    expect(instance.t("button.cancel", { ns: "common" })).toBe("Cancel");
  });

  it.each([
    ["en-US", "en"],
    ["en-GB", "en"],
    ["en-CA", "en"],
    ["en", "en"],
    ["fi", "fi-FI"],
    ["fi-FI", "fi-FI"],
    ["de", "de-DE"],
    ["de-AT", "de-DE"],
    ["cs-CZ", "cs-CZ"],
    ["pt", "pt-BR"],
    ["pt-PT", "pt-PT"],
    ["zh", "zh-CN"],
    ["zh-TW", "zh-TW"],
    ["th-TH", "en"], // unsupported language -> English source locale
  ])(
    "detected %s resolves to the shipped %s folder and never 404s",
    async (detected, expectedLocale) => {
      const { instance, requests } = await loadWithDetectedLanguage(detected);

      expect(
        requests.filter((r) => r.status === 404).map((r) => r.url),
      ).toEqual([]);
      expect(instance.resolvedLanguage).toBe(expectedLocale);
      for (const request of requests) {
        expect(availableLocales as readonly string[]).toContain(request.lng);
      }
      for (const ns of namespaces) {
        expect(instance.hasResourceBundle(expectedLocale, ns)).toBe(true);
      }
    },
  );
});
