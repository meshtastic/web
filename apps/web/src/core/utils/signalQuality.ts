import { Protobuf } from "@meshtastic/sdk";

type ModemPreset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;

export type SignalQuality = "good" | "fair" | "bad" | "none";

/** Spreading factor of each modem preset, as firmware sets it. */
const PRESET_SPREADING_FACTOR: Record<ModemPreset, number> = {
  [Preset.VERY_LONG_SLOW]: 12,
  [Preset.LONG_SLOW]: 12,
  [Preset.LONG_MODERATE]: 11,
  [Preset.LONG_FAST]: 11,
  [Preset.LONG_TURBO]: 11,
  [Preset.MEDIUM_SLOW]: 10,
  [Preset.MEDIUM_FAST]: 9,
  [Preset.MEDIUM_TURBO]: 9,
  [Preset.SHORT_SLOW]: 8,
  [Preset.SHORT_FAST]: 7,
  [Preset.SHORT_TURBO]: 7,
  [Preset.LITE_SLOW]: 10,
  [Preset.LITE_FAST]: 9,
  [Preset.NARROW_SLOW]: 8,
  [Preset.NARROW_FAST]: 7,
  [Preset.TINY_SLOW]: 8,
  [Preset.TINY_FAST]: 7,
};

const DEFAULT_SPREADING_FACTOR = PRESET_SPREADING_FACTOR[Preset.LONG_FAST];

/**
 * The LoRa settings that decide how weak a signal can be and still decode:
 * the preset, or the spreading factor when the preset is off.
 */
export interface LoRaSignalSettings {
  modemPreset?: ModemPreset;
  usePreset?: boolean;
  spreadFactor?: number;
}

/**
 * The lowest SNR in dB a packet can still be decoded at with these settings.
 * Semtech's floor is -7.5 dB at SF7 and 2.5 dB lower per spreading factor
 * step. Unknown settings count as LongFast.
 */
export function snrLimit(lora?: LoRaSignalSettings): number {
  const customSf =
    lora?.usePreset === false && lora.spreadFactor ? lora.spreadFactor : 0;
  const sf =
    customSf ||
    (lora?.modemPreset !== undefined
      ? PRESET_SPREADING_FACTOR[lora.modemPreset]
      : undefined) ||
    DEFAULT_SPREADING_FACTOR;
  return -7.5 - 2.5 * (sf - 7);
}

/**
 * Rates an SNR against the decode floor of the LoRa settings, as the Android
 * and Apple apps do. The same SNR means different things per preset: -15 dB
 * is good on LongSlow and unusable on ShortFast.
 */
export function snrQuality(
  snr: number,
  lora?: LoRaSignalSettings,
): SignalQuality {
  const margin = snr - snrLimit(lora);
  if (margin > 0) return "good";
  if (margin > -5.5) return "fair";
  if (margin >= -7.5) return "bad";
  return "none";
}

/** Rates an RSSI in dBm with the same bands as the Android and Apple apps. */
export function rssiQuality(rssi: number): SignalQuality {
  if (rssi > -115) return "good";
  if (rssi > -120) return "fair";
  if (rssi > -126) return "bad";
  return "none";
}
