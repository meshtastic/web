import {
  type HexColor,
  WCAG_AA_LARGE,
  WCAG_AA_TEXT,
} from "@core/theme/contrast.ts";

/**
 * Design token manifest. Mirrors the `--mt-*` custom properties in
 * src/index.css (`--mt-<name>` per theme); tokens.test.ts fails if the two
 * drift, and checks every pair in `contrastRequirements`.
 *
 * Dark values are the design mockup values. Light values are derived: same
 * semantic structure, slate neutrals, and the brand green darkened (same hue)
 * so it stays legible for text on light surfaces.
 */

export const themeNames = ["dark", "light"] as const;
export type ThemeName = (typeof themeNames)[number];

export const colorTokenNames = [
  "bg-rail",
  "bg-app",
  "bg-surface",
  "bg-chat",
  "bg-raised",
  "bg-selected",
  "bg-rail-active",
  "bg-inset",
  "border-subtle",
  "border-control",
  "border-input",
  "border-elevated",
  "fg-primary",
  "fg-secondary",
  "fg-muted",
  "accent",
  "accent-hover",
  "on-accent",
  "accent-tint",
  "accent-tint-border",
  "on-accent-tint",
  "toggle-on",
  "toggle-knob",
  "toggle-off",
  "bubble-sent",
  "on-bubble-sent",
  "bubble-pending",
  "on-bubble-pending",
  "bubble-failed",
  "on-bubble-failed",
  "warning-fg",
  "warning-bg",
  "warning-border",
  "warning-border-subtle",
  "warning-dirty",
  "danger-fg",
  "danger-bg",
  "danger-border",
  "danger-border-subtle",
  "on-danger",
  "danger-strong",
  "on-danger-strong",
  "device-avatar",
  "on-device-avatar",
  "online",
  "offline",
  "focus",
  "avatar-ink-dark",
  "avatar-ink-light",
] as const;
export type ColorTokenName = (typeof colorTokenNames)[number];

/** Non-colour tokens (translucent layers, elevation). Compared by string value. */
export const effectTokenNames = [
  "scrim",
  "overlay",
  "shadow-raised",
  "shadow-popover",
  "shadow-floating",
  "shadow-dialog",
] as const;
export type EffectTokenName = (typeof effectTokenNames)[number];

type ColorPalette = Readonly<Record<ColorTokenName, HexColor>>;
type EffectSet = Readonly<Record<EffectTokenName, string>>;

export const colorTokens = {
  dark: {
    "bg-rail": "#080d18",
    "bg-app": "#0b1220",
    "bg-surface": "#0f172a",
    "bg-chat": "#111a2e",
    "bg-raised": "#1e293b",
    "bg-selected": "#1a2740",
    "bg-rail-active": "#16233b",
    "bg-inset": "#172036",
    "border-subtle": "#1a2438",
    "border-control": "#243049",
    "border-input": "#64748b",
    "border-elevated": "#2a3753",
    "fg-primary": "#e2e8f0",
    "fg-secondary": "#cbd5e1",
    "fg-muted": "#94a3b8",
    accent: "#67ea94",
    "accent-hover": "#a7f3c4",
    "on-accent": "#052e16",
    "accent-tint": "#13301f",
    "accent-tint-border": "#2f6b47",
    "on-accent-tint": "#d1fae5",
    "toggle-on": "#22a35a",
    "toggle-knob": "#ffffff",
    "toggle-off": "#334155",
    "bubble-sent": "#1b4332",
    "on-bubble-sent": "#ecfdf5",
    "bubble-pending": "#18352a",
    "on-bubble-pending": "#ecfdf5",
    "bubble-failed": "#3a1d22",
    "on-bubble-failed": "#ecfdf5",
    "warning-fg": "#fde68a",
    "warning-bg": "#1f1a0e",
    "warning-border": "#4d3b12",
    "warning-border-subtle": "#3f3a1e",
    "warning-dirty": "#fbbf24",
    "danger-fg": "#fca5a5",
    "danger-bg": "#2a1215",
    "danger-border": "#7f1d1d",
    "danger-border-subtle": "#4c1d1d",
    "on-danger": "#fecaca",
    "danger-strong": "#f87171",
    "on-danger-strong": "#0b1220",
    "device-avatar": "#3b5ba9",
    "on-device-avatar": "#ffffff",
    online: "#67ea94",
    offline: "#64748b",
    focus: "#67ea94",
    "avatar-ink-dark": "#000000",
    "avatar-ink-light": "#ffffff",
  },
  light: {
    "bg-rail": "#e8edf4",
    "bg-app": "#f1f5f9",
    "bg-surface": "#ffffff",
    "bg-chat": "#f8fafc",
    "bg-raised": "#e2e8f0",
    "bg-selected": "#e3ebf7",
    "bg-rail-active": "#d9e4f5",
    "bg-inset": "#eef2f7",
    "border-subtle": "#e2e8f0",
    "border-control": "#cbd5e1",
    "border-input": "#7b8aa0",
    "border-elevated": "#cbd5e1",
    "fg-primary": "#0f172a",
    "fg-secondary": "#334155",
    "fg-muted": "#475569",
    accent: "#11743a",
    "accent-hover": "#0b5a2c",
    "on-accent": "#ffffff",
    "accent-tint": "#dcf5e5",
    "accent-tint-border": "#86d0a2",
    "on-accent-tint": "#052e16",
    "toggle-on": "#11743a",
    "toggle-knob": "#ffffff",
    "toggle-off": "#7b8aa0",
    "bubble-sent": "#cdeed9",
    "on-bubble-sent": "#052e16",
    "bubble-pending": "#e3f4e9",
    "on-bubble-pending": "#052e16",
    "bubble-failed": "#fde2e4",
    "on-bubble-failed": "#450a0a",
    "warning-fg": "#854d0e",
    "warning-bg": "#fffbeb",
    "warning-border": "#fcd34d",
    "warning-border-subtle": "#fde68a",
    "warning-dirty": "#b45309",
    "danger-fg": "#b91c1c",
    "danger-bg": "#fef2f2",
    "danger-border": "#fca5a5",
    "danger-border-subtle": "#fecaca",
    "on-danger": "#991b1b",
    "danger-strong": "#c81e1e",
    "on-danger-strong": "#ffffff",
    "device-avatar": "#3b5ba9",
    "on-device-avatar": "#ffffff",
    online: "#15803d",
    offline: "#64748b",
    focus: "#11743a",
    "avatar-ink-dark": "#000000",
    "avatar-ink-light": "#ffffff",
  },
} as const satisfies Readonly<Record<ThemeName, ColorPalette>>;

export const effectTokens = {
  dark: {
    scrim: "rgba(4, 8, 16, 0.92)",
    overlay: "rgba(15, 23, 42, 0.92)",
    "shadow-raised": "0 4px 12px rgba(0, 0, 0, 0.4)",
    "shadow-popover": "0 8px 20px rgba(0, 0, 0, 0.45)",
    "shadow-floating": "0 16px 40px rgba(0, 0, 0, 0.5)",
    "shadow-dialog": "0 24px 60px rgba(0, 0, 0, 0.6)",
  },
  light: {
    scrim: "rgba(15, 23, 42, 0.4)",
    overlay: "rgba(255, 255, 255, 0.92)",
    "shadow-raised": "0 4px 12px rgba(15, 23, 42, 0.08)",
    "shadow-popover": "0 8px 20px rgba(15, 23, 42, 0.12)",
    "shadow-floating": "0 16px 40px rgba(15, 23, 42, 0.16)",
    "shadow-dialog": "0 24px 60px rgba(15, 23, 42, 0.2)",
  },
} as const satisfies Readonly<Record<ThemeName, EffectSet>>;

export interface ContrastRequirement {
  readonly fg: ColorTokenName;
  readonly bg: ColorTokenName;
  readonly min: number;
  /** Where the pair occurs, for failure messages. */
  readonly use: string;
}

const text = (
  fg: ColorTokenName,
  bgs: readonly ColorTokenName[],
  use: string,
): ContrastRequirement[] =>
  bgs.map((bg) => ({ fg, bg, min: WCAG_AA_TEXT, use }));

const ui = (
  fg: ColorTokenName,
  bgs: readonly ColorTokenName[],
  use: string,
): ContrastRequirement[] =>
  bgs.map((bg) => ({ fg, bg, min: WCAG_AA_LARGE, use }));

const allBackgrounds = [
  "bg-rail",
  "bg-app",
  "bg-surface",
  "bg-chat",
  "bg-raised",
  "bg-selected",
  "bg-rail-active",
  "bg-inset",
] as const satisfies readonly ColorTokenName[];

const contentBackgrounds = [
  "bg-app",
  "bg-surface",
  "bg-chat",
  "bg-raised",
  "bg-selected",
  "bg-inset",
] as const satisfies readonly ColorTokenName[];

/**
 * Pairs that must meet WCAG AA in every theme: 4.5:1 for text, 3:1 for
 * non-text UI (focus rings, indicators, input outlines). Shadcn-scope pairs
 * are covered through the tokens they map to in index.css.
 */
export const contrastRequirements: readonly ContrastRequirement[] = [
  ...text("fg-primary", allBackgrounds, "primary text"),
  ...text("fg-secondary", contentBackgrounds, "secondary text"),
  ...text("fg-muted", allBackgrounds, "muted / meta text"),
  ...text(
    "accent",
    [...contentBackgrounds, "bg-rail", "bg-rail-active", "accent-tint"],
    "accent text, links, active rail icon",
  ),
  ...text("accent-hover", ["bg-surface", "bg-chat"], "hovered link"),
  ...text("on-accent", ["accent"], "text on accent buttons"),
  ...text("on-accent-tint", ["accent-tint"], "success toast text"),
  ...text("on-bubble-sent", ["bubble-sent"], "sent bubble text"),
  ...text("on-bubble-pending", ["bubble-pending"], "pending bubble text"),
  ...text("on-bubble-failed", ["bubble-failed"], "failed bubble text"),
  ...text(
    "warning-fg",
    ["warning-bg", "bg-surface", "bg-app"],
    "warning text and icons",
  ),
  ...text(
    "danger-fg",
    ["danger-bg", "bg-surface", "bg-chat", "bg-app"],
    "danger text, delivery failure",
  ),
  ...text("on-danger", ["danger-bg"], "danger button text"),
  ...text(
    "danger-strong",
    ["bg-surface", "bg-app"],
    "shadcn text-destructive on background",
  ),
  ...text("on-danger-strong", ["danger-strong"], "shadcn destructive button"),
  ...text("on-device-avatar", ["device-avatar"], "device avatar initials"),
  ...ui("focus", allBackgrounds, "focus ring"),
  ...ui("online", ["bg-surface", "bg-rail", "bg-app"], "online dot"),
  ...ui("offline", ["bg-surface"], "offline dot"),
  ...ui(
    "warning-dirty",
    ["bg-surface", "bg-app", "bg-chat"],
    "unsaved-change marker",
  ),
  ...ui("toggle-on", ["bg-surface"], "switch track (on)"),
  ...ui("toggle-knob", ["toggle-on"], "switch knob on track"),
  ...ui("toggle-knob", ["toggle-off"], "switch knob on track (off)"),
  ...ui("border-input", ["bg-surface", "bg-app"], "text input outline"),
];

export interface ContrastException {
  readonly theme: ThemeName;
  readonly fg: ColorTokenName;
  readonly bg: ColorTokenName;
  readonly reason: string;
}

/**
 * Required pairs that a theme knowingly misses. Empty: the dark mockup's input
 * border (#334155) and offline dot (#475569) failed WCAG 1.4.11 (3:1), so both
 * were lifted to slate-500. tokens.test.ts fails if an exception starts
 * passing, so the list cannot go stale.
 */
export const contrastExceptions: readonly ContrastException[] = [];

/** Named font-size steps declared as `--text-<name>` in the @theme block. */
export const typeScaleNames = [
  "meta",
  "help",
  "body",
  "header",
  "header-lg",
  "title",
  "title-lg",
  "display",
  "display-lg",
] as const;

/** Named radii declared as `--radius-<name>` in the @theme block. */
export const radiusNames = [
  "control",
  "card",
  "panel",
  "bubble",
  "tail",
] as const;

/** Named shadows declared as `--shadow-<name>` in the @theme block. */
export const shadowNames = ["raised", "popover", "floating", "dialog"] as const;

export const cssVariableName = (
  token: ColorTokenName | EffectTokenName,
): `--mt-${ColorTokenName | EffectTokenName}` => `--mt-${token}`;
