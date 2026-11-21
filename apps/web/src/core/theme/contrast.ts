import type { RGBColor } from "@core/utils/color.ts";

/** A CSS hex colour: `#rgb` or `#rrggbb`. */
export type HexColor = `#${string}`;

/** WCAG 2.x AA minimums: body text, and large text / UI components. */
export const WCAG_AA_TEXT = 4.5;
export const WCAG_AA_LARGE = 3;

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Parses `#rgb` / `#rrggbb` (case-insensitive). Returns undefined for anything else. */
export function parseHexColor(value: string): RGBColor | undefined {
  if (!HEX_PATTERN.test(value)) {
    return undefined;
  }
  const digits = value.slice(1);
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : digits;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

const linearise = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.x relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance({ r, g, b }: RGBColor): number {
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/** WCAG 2.x contrast ratio between two colours, 1 to 21. Order-independent. */
export function contrastRatio(a: RGBColor, b: RGBColor): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Contrast ratio between two hex colours, or undefined if either is not a hex colour. */
export function hexContrastRatio(a: string, b: string): number | undefined {
  const rgbA = parseHexColor(a);
  const rgbB = parseHexColor(b);
  if (rgbA === undefined || rgbB === undefined) {
    return undefined;
  }
  return contrastRatio(rgbA, rgbB);
}

/** True when `ratio` meets `minimum` (no rounding up: 4.49 fails 4.5). */
export function meetsContrast(ratio: number, minimum: number): boolean {
  return ratio >= minimum;
}
