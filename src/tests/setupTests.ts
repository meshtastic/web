import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import "@testing-library/jest-dom";

// Enable auto mocks for our UI components
//vi.mock('@components/UI/Dialog.tsx');
//vi.mock('@components/UI/Typography/Link.tsx');

globalThis.ResizeObserver = class {
  observe() { }
  unobserve() { }
  disconnect() { }
};

afterEach(() => {
  cleanup();
});