/**
 * Fitting a short name into a fixed-width avatar. Widths are estimates in
 * em for the app's font at semibold, measured from Inter; they only need
 * to be close enough to tell when four wide characters would overflow.
 */

const graphemes = (text: string): string[] =>
  Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text),
    (part) => part.segment,
  );

const charWidthEm = (char: string): number => {
  if (/\p{Extended_Pictographic}/u.test(char)) return 1.25;
  if (char === "W") return 1.05;
  if (char === "M" || char === "m") return 0.93;
  if (char === "w") return 0.85;
  if (char === "I" || /[ijl]/.test(char)) return 0.32;
  if (/[frt]/.test(char)) return 0.45;
  if (/[A-Z]/.test(char)) return 0.74;
  if (/[0-9]/.test(char)) return 0.64;
  if (/[a-z]/.test(char)) return 0.6;
  return 0.75;
};

/** Estimated width of `initials`, in em. */
export const initialsWidthEm = (initials: string): number =>
  graphemes(initials).reduce((sum, char) => sum + charWidthEm(char), 0);

/**
 * How much to shrink the text so `initials` fit in `availableEm`: 1 when
 * they already fit, else the ratio, never below `minScale`.
 */
export const initialsScale = (
  initials: string,
  availableEm: number,
  minScale = 0.7,
): number => {
  const width = initialsWidthEm(initials);
  if (width <= availableEm) return 1;
  return Math.max(minScale, Math.floor((availableEm / width) * 100) / 100);
};
