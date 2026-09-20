import { Protobuf } from "@meshtastic/sdk";

export type SignalQuality = "good" | "fair" | "bad" | "none";

/**
 * SNR demodulation floor (dB) per modem preset, ported from Android's
 * ChannelOption.snrLimit (meshtastic/web#1241, meshtastic/design#15).
 * LONG_SLOW is -20 (the physically-correct SF12 floor); Meshtastic-Apple
 * returns -7.5 there, which Android documents as an apparent bug.
 */
const SNR_LIMITS: Record<string, number> = {
  LONG_FAST: -17.5,
  LONG_SLOW: -20,
  VERY_LONG_SLOW: -20,
  MEDIUM_SLOW: -15,
  MEDIUM_FAST: -12.5,
  SHORT_SLOW: -10,
  SHORT_FAST: -7.5,
  LONG_MODERATE: -17.5,
  SHORT_TURBO: -7.5,
  LONG_TURBO: -12.5,
  LITE_FAST: -12.5,
  LITE_SLOW: -15,
  NARROW_FAST: -10,
  NARROW_SLOW: -12.5,
  TINY_FAST: -7.5,
  TINY_SLOW: -10,
  // NOTE: Meshtastic-Apple rates TINY_FAST/TINY_SLOW as -12.5/-15
  // ("20kHz ham presets, best link budget"); Android says SF7/SF8 floors.
  // Divergence flagged in meshtastic/web#1241 PR for maintainer ruling;
  // we follow Android pending that call.
  // Not yet in this repo's vendored protobufs, present in protobufs master
  // (value 16) and Android's ChannelOption — keyed by name so it activates
  // automatically when the SDK dep bumps.
  MEDIUM_TURBO: -12.5,
};

/** Unknown/deprecated presets fall back to LONG_FAST, mirroring Android. */
const DEFAULT_SNR_LIMIT = -17.5;

const QUALITY_RANK: Record<SignalQuality, number> = {
  none: 0,
  bad: 1,
  fair: 2,
  good: 3,
};

export function getSnrLimit(preset?: number | string | null): number {
  const name =
    typeof preset === "number"
      ? (
          Protobuf.Config.Config_LoRaConfig_ModemPreset as Record<
            number,
            string
          >
        )[preset]
      : preset;
  if (name == null) return DEFAULT_SNR_LIMIT;
  return SNR_LIMITS[name] ?? DEFAULT_SNR_LIMIT;
}

function tierFromMargin(margin: number): SignalQuality {
  if (margin > 0) return "good";
  if (margin > -5.5) return "fair";
  if (margin >= -7.5) return "bad";
  return "none";
}

/**
 * Preset-relative signal quality.
 *
 * With a known nonzero noise floor (node LocalStats telemetry), rates both
 * the reported-SNR margin and the physical link margin
 * ((rssi − noiseFloor) − limit) and returns the more conservative tier.
 * Otherwise falls back to SNR-only, blended with fixed RSSI thresholds
 * (-115/-120/-126) exactly as specified in meshtastic/web#1241.
 */
export function rateSignalQuality(
  snr: number,
  preset?: number | string | null,
  rssi?: number | null,
  noiseFloor?: number | null,
): SignalQuality {
  const limit = getSnrLimit(preset);

  if (
    typeof rssi === "number" &&
    typeof noiseFloor === "number" &&
    noiseFloor !== 0
  ) {
    const linkMargin = rssi - noiseFloor - limit;
    const conservative = Math.min(
      QUALITY_RANK[tierFromMargin(snr - limit)],
      QUALITY_RANK[tierFromMargin(linkMargin)],
    );
    return (Object.keys(QUALITY_RANK) as SignalQuality[]).find(
      (q) => QUALITY_RANK[q] === conservative,
    ) as SignalQuality;
  }

  if (typeof rssi === "number" && rssi !== 0) {
    const margin = snr - limit;
    if (rssi > -115 && margin > 0) return "good";
    if (rssi < -126 && margin < -7.5) return "none";
    if (rssi <= -120 || margin <= -5.5) return "bad";
    return "fair";
  }

  return tierFromMargin(snr - limit);
}
