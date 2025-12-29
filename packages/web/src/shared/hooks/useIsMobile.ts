/**
 * useIsMobile - React 19 hook using useSyncExternalStore
 *
 * Subscribes to viewport width changes via matchMedia without tearing issues.
 * Returns a boolean indicating if the viewport is below the mobile breakpoint.
 */

import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;


const mobileStore = {
  getSnapshot(): boolean {
    return window.innerWidth < MOBILE_BREAKPOINT;
  },

  subscribe(onStoreChange: () => void): () => void {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = () => onStoreChange();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  },
};


export function useIsMobile(): boolean {
  return useSyncExternalStore(
    mobileStore.subscribe,
    mobileStore.getSnapshot,
    mobileStore.getSnapshot,
  );
}
