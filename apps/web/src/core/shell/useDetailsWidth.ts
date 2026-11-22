import {
  type RefObject,
  useCallback,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  clampDetailsWidth,
  DEFAULT_DETAILS_WIDTH,
  DETAILS_WIDTH_KEY,
  maxDetailsWidth,
  MIN_DETAILS_WIDTH,
  parseDetailsWidth,
} from "./detailsWidth.ts";

const readStored = (): number | undefined => {
  try {
    return parseDetailsWidth(window.localStorage.getItem(DETAILS_WIDTH_KEY));
  } catch {
    // Storage blocked (private window, site data off): use the default.
    return undefined;
  }
};

const writeStored = (width: number | undefined): void => {
  try {
    if (width === undefined) {
      window.localStorage.removeItem(DETAILS_WIDTH_KEY);
    } else {
      window.localStorage.setItem(DETAILS_WIDTH_KEY, String(width));
    }
  } catch {
    // Not remembered, but the panel still resizes for this visit.
  }
};

const subscribeToResize = (onChange: () => void) => {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
};
const getViewportWidth = () => window.innerWidth;
const getServerViewportWidth = () => 0;

/** Follows an element's width; 0 until it has been laid out. */
function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    setWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

export interface DetailsWidth {
  /** The width to render, clamped to the room there is now. */
  width: number;
  min: number;
  max: number;
  default: number;
  /** Clamps, applies and remembers a width. */
  setWidth: (next: number) => void;
  /** Back to the default, forgetting the stored width. */
  reset: () => void;
}

/**
 * The details column's width, remembered per browser and re-clamped as the
 * window or the shell row (`row`) changes size. `reservedWidth` is what the
 * row's other fixed columns (the sidebar) take.
 */
export function useDetailsWidth(
  row: RefObject<HTMLElement | null>,
  reservedWidth: number,
): DetailsWidth {
  const viewportWidth = useSyncExternalStore(
    subscribeToResize,
    getViewportWidth,
    getServerViewportWidth,
  );
  const measured = useElementWidth(row);
  const [stored, setStored] = useState(readStored);

  const max = maxDetailsWidth({
    viewportWidth,
    // Before layout (and in environments without one), assume the row
    // spans the viewport.
    rowWidth: measured > 0 ? measured : viewportWidth,
    reservedWidth,
  });

  const setWidth = useCallback(
    (next: number) => {
      const width = clampDetailsWidth(next, max);
      setStored(width);
      writeStored(width);
    },
    [max],
  );
  const reset = useCallback(() => {
    setStored(undefined);
    writeStored(undefined);
  }, []);

  return {
    width: clampDetailsWidth(stored ?? DEFAULT_DETAILS_WIDTH, max),
    min: MIN_DETAILS_WIDTH,
    max,
    default: DEFAULT_DETAILS_WIDTH,
    setWidth,
    reset,
  };
}
