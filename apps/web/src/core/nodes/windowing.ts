/**
 * Fixed-height list windowing: which rows to render for a scroll position,
 * so a mesh with a thousand nodes renders a screenful plus some overscan.
 */

export interface WindowRange {
  /** First rendered index (inclusive). */
  readonly start: number;
  /** Last rendered index (exclusive). */
  readonly end: number;
  /** Space above the rendered rows, in px. */
  readonly padTop: number;
  /** Space below the rendered rows, in px. */
  readonly padBottom: number;
}

export interface WindowInput {
  readonly count: number;
  readonly rowHeight: number;
  readonly scrollTop: number;
  /** 0 before the container is measured. */
  readonly viewportHeight: number;
  readonly overscan?: number;
  /** Rows to render before the viewport has been measured. */
  readonly initialRows?: number;
}

export const visibleRange = ({
  count,
  rowHeight,
  scrollTop,
  viewportHeight,
  overscan = 8,
  initialRows = 40,
}: WindowInput): WindowRange => {
  if (count <= 0 || rowHeight <= 0) {
    return { start: 0, end: 0, padTop: 0, padBottom: 0 };
  }
  const visible =
    viewportHeight > 0 ? Math.ceil(viewportHeight / rowHeight) : initialRows;
  const first = Math.min(
    Math.max(0, Math.floor(Math.max(0, scrollTop) / rowHeight) - overscan),
    count - 1,
  );
  const end = Math.min(count, first + visible + overscan * 2);
  return {
    start: first,
    end,
    padTop: first * rowHeight,
    padBottom: (count - end) * rowHeight,
  };
};
