import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { enableMapSet } from "immer";
import "@testing-library/jest-dom";

enableMapSet();

globalThis.ResizeObserver = class {
  observe() { }
  unobserve() { }
  disconnect() { }
};

afterEach(() => {
  cleanup();
});