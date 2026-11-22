import type { HexColor } from "@core/theme/contrast.ts";
import {
  type ColorTokenName,
  colorTokens,
  type ThemeName,
} from "@core/theme/tokens.ts";
import type { SignalQuality } from "@core/utils/signalQuality.ts";

/** The token each signal quality is drawn in (map SNR lines). */
export const signalLineToken: Readonly<Record<SignalQuality, ColorTokenName>> =
  {
    good: "accent",
    fair: "warning-dirty",
    bad: "danger-strong",
    none: "danger-strong",
  };

/**
 * The resolved colour for a signal quality in a theme. Map paint
 * properties take colour values, not CSS classes or variables.
 */
export const signalLineColor = (
  quality: SignalQuality,
  theme: ThemeName,
): HexColor => colorTokens[theme][signalLineToken[quality]];
