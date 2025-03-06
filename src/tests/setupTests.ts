import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from "@testing-library/jest-dom/matchers";

class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
}

globalThis.ResizeObserver = ResizeObserver;

expect.extend(matchers);

afterEach(() => {
  cleanup();
});