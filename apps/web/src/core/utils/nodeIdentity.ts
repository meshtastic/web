import { contrastRatio } from "@core/theme/contrast.ts";
import { getColorFromNodeNum, type RGBColor } from "./color.ts";

/**
 * How a node is named and drawn in lists, avatars and headers. Pure: the
 * localised fallback ("Meshtastic 5a97") is supplied by the caller.
 */

export interface NodeNames {
  readonly longName?: string | null;
  readonly shortName?: string | null;
}

const MAX_INITIALS = 4;

const clean = (value: string | null | undefined): string =>
  (value ?? "").trim();

/** Last four hex digits of a node number, upper-case: `!71275a97` → `5A97`. */
export const nodeIdSuffix = (nodeNum: number): string =>
  (nodeNum >>> 0).toString(16).toUpperCase().padStart(4, "0").slice(-4);

/** Canonical `!xxxxxxxx` node id. */
export const formatNodeId = (nodeNum: number): string =>
  `!${(nodeNum >>> 0).toString(16).padStart(8, "0")}`;

/**
 * Up to four characters for an avatar: the short name the node chose
 * (verbatim, it is usually already an abbreviation), else the first letter
 * of up to two words of the long name, else the node id suffix.
 */
export const initialsFor = (names: NodeNames, nodeNum: number): string => {
  const shortName = clean(names.shortName);
  if (shortName) {
    return Array.from(shortName).slice(0, MAX_INITIALS).join("");
  }
  const words = clean(names.longName).split(/\s+/u).filter(Boolean);
  if (words.length > 0) {
    return words
      .slice(0, 2)
      .map((word) => Array.from(word)[0] ?? "")
      .join("")
      .toUpperCase();
  }
  return nodeIdSuffix(nodeNum);
};

/**
 * Name to show for a node: long name, then short name, then the caller's
 * localised fallback built from the id suffix.
 */
export const nodeDisplayName = (
  names: NodeNames,
  nodeNum: number,
  fallback: (idSuffix: string) => string,
): string =>
  clean(names.longName) ||
  clean(names.shortName) ||
  fallback(nodeIdSuffix(nodeNum));

/** RGB of the `avatar-ink-dark` / `avatar-ink-light` tokens (theme-independent). */
export const AVATAR_INK_DARK: RGBColor = { r: 0, g: 0, b: 0 };
export const AVATAR_INK_LIGHT: RGBColor = { r: 255, g: 255, b: 255 };

export interface NodeAvatarColors {
  /** CSS colour for the avatar fill, derived from the node number. */
  readonly background: string;
  /**
   * Which ink reads best on the fill: the higher-contrast of black and
   * white, white on a tie, which is what CSS `contrast-color()` picks.
   */
  readonly ink: "dark" | "light";
  /** WCAG contrast of the chosen ink on the fill. */
  readonly contrast: number;
}

/**
 * Contrast the initials get on every node colour. Black or white alone only
 * guarantee about 4.6:1, which reads poorly at avatar sizes on mid-tones
 * (MDN's caveat for contrast-color()), so fills are moved further from
 * their ink until they reach this.
 */
export const AVATAR_MIN_CONTRAST = 7;

const mixRgb = (from: RGBColor, to: RGBColor, t: number): RGBColor => ({
  r: Math.round(from.r + (to.r - from.r) * t),
  g: Math.round(from.g + (to.g - from.g) * t),
  b: Math.round(from.b + (to.b - from.b) * t),
});

/**
 * Per-node avatar colour: the node's colour (as elsewhere in the client),
 * mixed towards white under dark ink or black under light ink just enough
 * to reach AVATAR_MIN_CONTRAST, so the hue stays recognisable.
 */
export const nodeAvatarColors = (nodeNum: number): NodeAvatarColors => {
  const base = getColorFromNodeNum(nodeNum);
  const dark =
    contrastRatio(base, AVATAR_INK_DARK) >
    contrastRatio(base, AVATAR_INK_LIGHT);
  const ink = dark ? AVATAR_INK_DARK : AVATAR_INK_LIGHT;
  // Away from the ink: towards white under black text, black under white.
  const away = dark ? AVATAR_INK_LIGHT : AVATAR_INK_DARK;
  let fill = base;
  for (
    let step = 1;
    contrastRatio(fill, ink) < AVATAR_MIN_CONTRAST && step <= 50;
    step++
  ) {
    fill = mixRgb(base, away, step / 50);
  }
  return {
    background: `rgb(${fill.r}, ${fill.g}, ${fill.b})`,
    ink: dark ? "dark" : "light",
    contrast: contrastRatio(fill, ink),
  };
};
