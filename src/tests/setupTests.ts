import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { enableMapSet } from "immer";
import "@testing-library/jest-dom";
import '@testing-library/user-event';

enableMapSet();

vi.mock('idb-keyval', () => ({
  get: vi.fn((key) => Promise.resolve(undefined)),
  set: vi.fn((key, value) => Promise.resolve()),
  del: vi.fn((key) => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve()),
  keys: vi.fn(() => Promise.resolve([])),
  createStore: vi.fn((dbName, storeName) => ({
  })),
}));
globalThis.ResizeObserver = class {
  observe() { }
  unobserve() { }
  disconnect() { }
};

afterEach(() => {
  cleanup();
});