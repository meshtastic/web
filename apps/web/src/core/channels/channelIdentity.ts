import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";

type ChannelSettings = Protobuf.Channel.ChannelSettings;
type LoRa = Protobuf.Config.Config_LoRaConfig;

const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;

/**
 * Firmware's display name for each preset (DisplayFormatters::
 * getModemPresetDisplayName), which an unnamed channel goes by. Two are
 * abbreviated, so the names can't be derived from the enum. Keyed by enum
 * name so presets newer than these protobufs still resolve.
 */
const PRESET_NAMES: Readonly<Record<string, string>> = {
  SHORT_TURBO: "ShortTurbo",
  SHORT_FAST: "ShortFast",
  SHORT_SLOW: "ShortSlow",
  MEDIUM_FAST: "MediumFast",
  MEDIUM_SLOW: "MediumSlow",
  MEDIUM_TURBO: "MediumTurbo",
  LONG_FAST: "LongFast",
  LONG_SLOW: "LongSlow",
  LONG_MODERATE: "LongMod",
  VERY_LONG_SLOW: "VLongSlow",
  LONG_TURBO: "LongTurbo",
  LITE_FAST: "LiteFast",
  LITE_SLOW: "LiteSlow",
  NARROW_FAST: "NarrowFast",
  NARROW_SLOW: "NarrowSlow",
  TINY_FAST: "TinyFast",
  TINY_SLOW: "TinySlow",
};

/** The well-known (not secret) default AES-128 key; a 1-byte PSK picks a member of its family. */
const DEFAULT_KEY = new Uint8Array([
  0xd4, 0xf1, 0xbb, 0x3a, 0x20, 0x29, 0x07, 0x59, 0xf0, 0xbc, 0xff, 0xab, 0xcf,
  0x4e, 0x69, 0x01,
]);

/** The LoRa settings a radio ships with: LongFast on a preset. */
export const DEFAULT_LORA: LoRa = create(
  Protobuf.Config.Config_LoRaConfigSchema,
  {
    usePreset: true,
    modemPreset: Preset.LONG_FAST,
    hopLimit: 3,
    txEnabled: true,
  },
);

/** What makes two channels the same channel: the name and key the radio uses. */
export interface ChannelIdentity {
  readonly name: string;
  readonly psk: Uint8Array;
}

/**
 * The name a channel goes by: its own, or for an unnamed channel the
 * preset's display name ("Custom" off a preset). Mirrors Android
 * `Channel.name` (core/model/.../Channel.kt).
 */
export function effectiveChannelName(
  settings: ChannelSettings,
  lora: LoRa,
): string {
  if (settings.name) return settings.name;
  if (!lora.usePreset) return "Custom";
  const preset = Preset[lora.modemPreset];
  return (preset && PRESET_NAMES[preset]) ?? "";
}

/**
 * The key a channel uses: a 1-byte PSK is shorthand, 0 for no key and n
 * for the default key with its last byte raised by n - 1. Mirrors Android
 * `Channel.psk` (core/model/.../Channel.kt).
 */
export function effectiveChannelPsk(settings: ChannelSettings): Uint8Array {
  if (settings.psk.length !== 1) return settings.psk;
  const index = settings.psk[0] ?? 0;
  if (index === 0) return new Uint8Array();
  const key = DEFAULT_KEY.slice();
  const last = key.length - 1;
  key[last] = ((key[last] ?? 0) + index - 1) & 0xff;
  return key;
}

/**
 * Effective name and key under `lora`. Mirrors Android
 * `ChannelSettings.channelIdentity` (core/model/.../util/ChannelSetReplacement.kt).
 */
export const channelIdentity = (
  settings: ChannelSettings,
  lora: LoRa,
): ChannelIdentity => ({
  name: effectiveChannelName(settings, lora),
  psk: effectiveChannelPsk(settings),
});

export const sameIdentity = (a: ChannelIdentity, b: ChannelIdentity): boolean =>
  a.name === b.name &&
  a.psk.length === b.psk.length &&
  a.psk.every((byte, i) => byte === b.psk[i]);
