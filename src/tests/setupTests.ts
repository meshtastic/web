// Try this import style instead
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Add the matchers (should work with * as import)
expect.extend(matchers);

// Mock ResizeObserver
global.ResizeObserver = class {
  observe() { }
  unobserve() { }
  disconnect() { }
};

afterEach(() => {
  cleanup();
});