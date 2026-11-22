/** Remembered per browser; one width for every page's details panel. */
export const DETAILS_WIDTH_KEY = "meshtastic:detailsPanelWidth";
export const DEFAULT_DETAILS_WIDTH = 320;
export const MIN_DETAILS_WIDTH = 280;
export const MAX_DETAILS_WIDTH = 640;
/** The panel never takes more than this share of the viewport. */
export const MAX_DETAILS_VIEWPORT_RATIO = 0.5;
/** The conversation or page beside the panel keeps at least this much. */
export const MIN_MAIN_WIDTH = 420;
export const DETAILS_RESIZE_STEP = 16;
export const DETAILS_RESIZE_BIG_STEP = 64;

export interface DetailsRoom {
  viewportWidth: number;
  /** Width of the shell row the panel sits in (everything right of the rail). */
  rowWidth: number;
  /** Width of the row's other fixed columns, e.g. the sidebar. */
  reservedWidth: number;
}

/**
 * The widest the panel may be: min(640px, 50% of the viewport, what leaves
 * the main column 420px). Never below the default, which the layout has
 * always made room for from `lg` up.
 */
export function maxDetailsWidth({
  viewportWidth,
  rowWidth,
  reservedWidth,
}: DetailsRoom): number {
  const fits = Math.min(
    MAX_DETAILS_WIDTH,
    Math.floor(viewportWidth * MAX_DETAILS_VIEWPORT_RATIO),
    Math.floor(rowWidth - reservedWidth - MIN_MAIN_WIDTH),
  );
  return Math.max(DEFAULT_DETAILS_WIDTH, fits);
}

/** A whole-pixel width between the minimum and `max`. */
export function clampDetailsWidth(width: number, max: number): number {
  if (!Number.isFinite(width)) {
    return Math.min(max, DEFAULT_DETAILS_WIDTH);
  }
  return Math.min(max, Math.max(MIN_DETAILS_WIDTH, Math.round(width)));
}

/** A stored width, or `undefined` for nothing stored or anything unusable. */
export function parseDetailsWidth(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === "") {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}

export interface ResizeKey {
  key: string;
  shiftKey: boolean;
}

/**
 * The width a key asks for on the panel's left-edge separator, or
 * `undefined` for keys it ignores. The panel is on the right, so Left
 * widens it; 16px a press, 64px with Shift. Home and End go to the limits.
 */
export function detailsWidthForKey(
  { key, shiftKey }: ResizeKey,
  width: number,
  max: number,
): number | undefined {
  const step = shiftKey ? DETAILS_RESIZE_BIG_STEP : DETAILS_RESIZE_STEP;
  switch (key) {
    case "ArrowLeft":
      return clampDetailsWidth(width + step, max);
    case "ArrowRight":
      return clampDetailsWidth(width - step, max);
    case "Home":
      return MIN_DETAILS_WIDTH;
    case "End":
      return max;
    default:
      return undefined;
  }
}
