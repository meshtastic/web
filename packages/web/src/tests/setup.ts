import { cleanup } from "@testing-library/react";
import { enableMapSet } from "immer";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom";
import "@testing-library/user-event";
import channelsEN from "@public/i18n/locales/en/channels.json" with {
  type: "json",
};
import commandPaletteEN from "@public/i18n/locales/en/commandPalette.json" with {
  type: "json",
};
import commonEN from "@public/i18n/locales/en/common.json" with {
  type: "json",
};
import configEN from "@public/i18n/locales/en/config.json" with {
  type: "json",
};
import connectionsEN from "@public/i18n/locales/en/connections.json" with {
  type: "json",
};
import dialogEN from "@public/i18n/locales/en/dialog.json" with {
  type: "json",
};
import messagesEN from "@public/i18n/locales/en/messages.json" with {
  type: "json",
};
import moduleConfigEN from "@public/i18n/locales/en/moduleConfig.json" with {
  type: "json",
};
import nodesEN from "@public/i18n/locales/en/nodes.json" with { type: "json" };
import uiEN from "@public/i18n/locales/en/ui.json" with { type: "json" };
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

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

// Mock localStorage for happy-dom
const localStorageStore: { [key: string]: string } = {};
globalThis.localStorage = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value;
  },
  removeItem: (key: string) => {
    delete localStorageStore[key];
  },
  clear: () => {
    for (const key of Object.keys(localStorageStore)) {
      delete localStorageStore[key];
    }
  },
  key: (index: number) => Object.keys(localStorageStore)[index] ?? null,
  get length() {
    return Object.keys(localStorageStore).length;
  },
} as Storage;

// Mock matchMedia for happy-dom
globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

const appNamespaces = [
  "channels",
  "commandPalette",
  "common",
  "config",
  "moduleConfig",
  "connections",
  "dialog",
  "messages",
  "nodes",
  "ui",
];
const appFallbackNS = ["common", "ui", "dialog"];
const appDefaultNS = "common";

i18n.use(initReactI18next).init({
  lng: "en",

  ns: appNamespaces,
  defaultNS: appDefaultNS,
  fallbackNS: appFallbackNS,

  resources: {
    en: {
      channels: channelsEN,
      commandPalette: commandPaletteEN,
      common: commonEN,
      config: configEN,
      moduleConfig: moduleConfigEN,
      connections: connectionsEN,
      dialog: dialogEN,
      messages: messagesEN,
      nodes: nodesEN,
      ui: uiEN,
    },
  },

  interpolation: {
    escapeValue: false,
  },

  react: {
    useSuspense: false,
  },
  debug: false,
});

afterEach(() => {
  cleanup();
});
