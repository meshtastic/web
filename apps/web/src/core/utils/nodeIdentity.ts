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
   * Which ink token reads best on the fill: whichever of black and white
   * has the higher WCAG contrast. One of the two always reaches at least
   * 4.58:1, so initials meet AA on every node colour.
   */
  readonly ink: "dark" | "light";
  /** WCAG contrast of the chosen ink on the fill. */
  readonly contrast: number;
}

/** Per-node avatar colour, the same mapping the rest of the client uses. */
export const nodeAvatarColors = (nodeNum: number): NodeAvatarColors => {
  const color = getColorFromNodeNum(nodeNum);
  const onDark = contrastRatio(color, AVATAR_INK_DARK);
  const onLight = contrastRatio(color, AVATAR_INK_LIGHT);
  return {
    background: `rgb(${color.r}, ${color.g}, ${color.b})`,
    ink: onDark >= onLight ? "dark" : "light",
    contrast: Math.max(onDark, onLight),
  };
};
