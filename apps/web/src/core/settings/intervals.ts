/**
 * Preset choices for interval settings that the protobuf stores as a plain
 * number of seconds, matching the Android app's lists (IntervalConfiguration
 * in Meshtastic-Android). The protobuf has no option list for these fields;
 * the presets are what the apps offer.
 */

/**
 * "Always on", written as Android writes it. Firmware clamps any interval
 * above about 24.8 days, so this and every larger value (the proto comment
 * names the maximum uint32) all mean always on.
 */
export const ALWAYS_ON_SECS = 2_147_483_647;

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/** Display > Screen on for (`screen_on_secs`). */
export const SCREEN_ON_PRESETS: readonly number[] = [
  15,
  30,
  MINUTE,
  5 * MINUTE,
  10 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  ALWAYS_ON_SECS,
];

/** Display > Carousel interval (`auto_screen_carousel_secs`); 0 is off. */
export const CAROUSEL_PRESETS: readonly number[] = [
  0,
  15,
  30,
  MINUTE,
  5 * MINUTE,
  10 * MINUTE,
  15 * MINUTE,
];

export type IntervalLabel =
  | { readonly kind: "zero" }
  | { readonly kind: "alwaysOn" }
  | {
      readonly kind: "count";
      readonly unit: "seconds" | "minutes" | "hours";
      readonly count: number;
    };

/** How to name `seconds`: in the largest whole unit, or a special value. */
export function describeInterval(seconds: number): IntervalLabel {
  if (seconds <= 0) return { kind: "zero" };
  if (seconds >= ALWAYS_ON_SECS) return { kind: "alwaysOn" };
  if (seconds % HOUR === 0) {
    return { kind: "count", unit: "hours", count: seconds / HOUR };
  }
  if (seconds % MINUTE === 0) {
    return { kind: "count", unit: "minutes", count: seconds / MINUTE };
  }
  return { kind: "count", unit: "seconds", count: seconds };
}

/**
 * The values to offer: the presets, plus the current value when it is not
 * one of them, so a value set elsewhere is shown and kept rather than
 * silently replaced. A current value of always on (however it was written)
 * takes the always-on preset's place, keeping its own number.
 */
export function intervalChoices(
  presets: readonly number[],
  current: number | undefined,
): number[] {
  if (current === undefined || presets.includes(current)) {
    return [...presets];
  }
  if (current >= ALWAYS_ON_SECS) {
    return presets.map((value) => (value === ALWAYS_ON_SECS ? current : value));
  }
  return [...presets, current].sort((a, b) => a - b);
}
