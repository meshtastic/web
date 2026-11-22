/**
 * Keyboard movement for composite widgets with a roving tab stop (radio
 * groups, segmented controls, chip rows), per the WAI-ARIA practices:
 * arrows move and wrap, Home/End jump to the ends, disabled items are
 * skipped.
 */

export type RovingOrientation = "horizontal" | "vertical" | "both";

export interface RovingOptions {
  readonly orientation?: RovingOrientation;
  /** Right-to-left layouts swap the meaning of ArrowLeft and ArrowRight. */
  readonly dir?: "ltr" | "rtl";
  /** Indexes that cannot receive focus. */
  readonly disabled?: ReadonlySet<number>;
}

type Move = "next" | "prev" | "first" | "last";

const moveFor = (key: string, options: RovingOptions): Move | null => {
  const orientation = options.orientation ?? "horizontal";
  const horizontal = orientation !== "vertical";
  const vertical = orientation !== "horizontal";
  const rtl = options.dir === "rtl";
  switch (key) {
    case "ArrowRight":
      return horizontal ? (rtl ? "prev" : "next") : null;
    case "ArrowLeft":
      return horizontal ? (rtl ? "next" : "prev") : null;
    case "ArrowDown":
      return vertical ? "next" : null;
    case "ArrowUp":
      return vertical ? "prev" : null;
    case "Home":
      return "first";
    case "End":
      return "last";
    default:
      return null;
  }
};

/**
 * Index to move to after `key`, or `null` when the key is not a movement
 * key (let it through) or every item is disabled.
 */
export const nextRovingIndex = (
  current: number,
  key: string,
  count: number,
  options: RovingOptions = {},
): number | null => {
  const move = moveFor(key, options);
  if (move === null || count <= 0) {
    return null;
  }
  const disabled = options.disabled ?? new Set<number>();
  const enabled = (index: number) => !disabled.has(index);

  const scan = (start: number, step: 1 | -1): number | null => {
    for (let n = 0; n < count; n++) {
      const index = (((start + step * n) % count) + count) % count;
      if (enabled(index)) {
        return index;
      }
    }
    return null;
  };

  switch (move) {
    case "first":
      return scan(0, 1);
    case "last":
      return scan(count - 1, -1);
    case "next":
      return scan(current + 1, 1);
    case "prev":
      return scan(current - 1, -1);
  }
};
