import useLocalStorage from "@core/hooks/useLocalStorage.ts";
import { useCallback, useSyncExternalStore } from "react";

export const DRAWER_WIDTH_KEY = "meshtastic:web:sidebar:width";
export const DEFAULT_DRAWER_WIDTH = 440;
export const MIN_DRAWER_WIDTH = 360;
export const MAX_DRAWER_WIDTH = 960;
/** The drawer never takes more than this share of the viewport. */
export const MAX_DRAWER_VIEWPORT_RATIO = 0.75;
export const DRAWER_RESIZE_STEP = 16;
export const DRAWER_RESIZE_BIG_STEP = 64;

export function maxDrawerWidth(viewportWidth: number): number {
  return Math.max(
    MIN_DRAWER_WIDTH,
    Math.min(
      MAX_DRAWER_WIDTH,
      Math.floor(viewportWidth * MAX_DRAWER_VIEWPORT_RATIO),
    ),
  );
}

export function clampDrawerWidth(width: number, viewportWidth: number): number {
  const max = maxDrawerWidth(viewportWidth);
  return Math.min(max, Math.max(MIN_DRAWER_WIDTH, Math.round(width)));
}

/**
 * Reads a stored width. Anything that is not a finite number falls back to
 * the default; a parse failure is caught by useLocalStorage and does the same.
 */
export function parseStoredWidth(raw: string): number {
  const parsed: unknown = JSON.parse(raw);
  return typeof parsed === "number" && Number.isFinite(parsed)
    ? parsed
    : DEFAULT_DRAWER_WIDTH;
}

const subscribeToResize = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};
const getViewportWidth = () => window.innerWidth;

export interface DrawerWidth {
  /** The width to render, clamped to the current viewport. */
  width: number;
  min: number;
  max: number;
  /** Stores a width; it is clamped first. */
  setWidth: (next: number) => void;
  reset: () => void;
}

/**
 * The desktop drawer width, remembered in localStorage and re-clamped to
 * 360px … min(960px, 75vw) whenever the window resizes.
 */
export function useDrawerWidth(): DrawerWidth {
  const viewportWidth = useSyncExternalStore(
    subscribeToResize,
    getViewportWidth,
    () => MAX_DRAWER_WIDTH,
  );
  const [stored, setStored] = useLocalStorage<number>(
    DRAWER_WIDTH_KEY,
    DEFAULT_DRAWER_WIDTH,
    { deserializer: parseStoredWidth },
  );

  const setWidth = useCallback(
    (next: number) => setStored(clampDrawerWidth(next, window.innerWidth)),
    [setStored],
  );
  const reset = useCallback(() => setStored(DEFAULT_DRAWER_WIDTH), [setStored]);

  return {
    width: clampDrawerWidth(stored, viewportWidth),
    min: MIN_DRAWER_WIDTH,
    max: maxDrawerWidth(viewportWidth),
    setWidth,
    reset,
  };
}
