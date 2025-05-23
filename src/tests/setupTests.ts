import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { enableMapSet } from "immer";
import "@testing-library/jest-dom";
import "@testing-library/user-event";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "@app/i18n/locales/en.json";

enableMapSet();

vi.mock("idb-keyval", () => ({
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve()),
  keys: vi.fn(() => Promise.resolve([])),
  createStore: vi.fn(() => ({})),
}));

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

i18n
  .use(initReactI18next)
  .init({
    lng: "en",
    fallbackLng: "en",
    debug: false,
    resources: {
      en: {
        translation: enTranslations,
      },
    },
    interpolation: {
      escapeValue: false,
    },
    defaultNS: "translation",
    initImmediate: true,
  });

afterEach(() => {
  cleanup();
});
