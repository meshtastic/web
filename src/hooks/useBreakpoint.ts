/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import useBreakpointHook from 'use-breakpoint';

const BREAKPOINTS = {
  sm: 0,
  // => @media (min-width: 640px) { ... }

  md: 768,
  // => @media (min-width: 768px) { ... }

  lg: 1024,
  // => @media (min-width: 1024px) { ... }

  xl: 1280,
  // => @media (min-width: 1280px) { ... }

  '2xl': 1536,
  // => @media (min-width: 1536px) { ... }
};
export const useBreakpoint = () => useBreakpointHook(BREAKPOINTS);
