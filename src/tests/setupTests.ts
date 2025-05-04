import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { enableMapSet } from "immer";
import "@testing-library/jest-dom";
import "@testing-library/user-event";

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

afterEach(() => {
  cleanup();
});
