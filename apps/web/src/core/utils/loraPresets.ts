import { Protobuf } from "@meshtastic/sdk";

type ModemPreset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
type RegionCode = Protobuf.Config.Config_LoRaConfig_RegionCode;
type RegionPresetMap = Protobuf.Mesh.LoRaRegionPresetMap;
type PresetGroup = Protobuf.Mesh.LoRaPresetGroup;

const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;

/**
 * Modem presets that only firmware 2.8+ understands. Older firmware silently
 * falls back to LONG_FAST when it receives one, so they are hidden there.
 */
export const FIRMWARE_2_8_PRESETS: ReadonlySet<ModemPreset> = new Set([
  Preset.LITE_FAST,
  Preset.LITE_SLOW,
  Preset.NARROW_FAST,
  Preset.NARROW_SLOW,
  Preset.TINY_FAST,
  Preset.TINY_SLOW,
  Preset.MEDIUM_TURBO,
]);

/**
 * Regions that only firmware 2.8+ understands: EU_866 and every region added
 * after it (the EU 874/917 and narrow 868 bands, ITU3 2m, and the ITU 70cm
 * and 1.25m amateur bands).
 */
export const FIRMWARE_2_8_REGIONS: ReadonlySet<RegionCode> = new Set([
  Region.EU_866,
  Region.EU_874,
  Region.EU_917,
  Region.EU_N_868,
  Region.ITU3_2M,
  Region.ITU1_70CM,
  Region.ITU2_70CM,
  Region.ITU3_70CM,
  Region.ITU2_125CM,
]);

export interface LoRaCapabilities {
  /** FromRadio.region_presets, sent by firmware 2.8+. */
  regionPresets?: RegionPresetMap;
  /** True when the node runs firmware 2.8 or newer. */
  supportsFirmware28: boolean;
}

/**
 * The preset group for `region`, or undefined when the device sent no map or
 * the map has no entry for the region (no constraint applies then).
 */
export function getRegionPresetGroup(
  regionPresets: RegionPresetMap | undefined,
  region: RegionCode | undefined,
): PresetGroup | undefined {
  if (!regionPresets || region === undefined) return undefined;
  const entry = regionPresets.regionGroups.find((r) => r.region === region);
  if (!entry) return undefined;
  return regionPresets.groups[entry.groupIndex];
}

function allEnumValues(enumObj: Record<string, string | number>): number[] {
  return Object.values(enumObj).filter(
    (v): v is number => typeof v === "number",
  );
}

/** Presets the user may pick for `region` on this device. */
export function getAllowedPresets(
  caps: LoRaCapabilities,
  region: RegionCode | undefined,
): ModemPreset[] {
  const group = getRegionPresetGroup(caps.regionPresets, region);
  if (group) return [...group.presets];
  return allEnumValues(Preset).filter(
    (p) => caps.supportsFirmware28 || !FIRMWARE_2_8_PRESETS.has(p),
  );
}

/** Regions the user may pick on this device. */
export function getAllowedRegions(caps: LoRaCapabilities): RegionCode[] {
  return allEnumValues(Region).filter(
    (r) => caps.supportsFirmware28 || !FIRMWARE_2_8_REGIONS.has(r),
  );
}

export function isPresetAllowed(
  caps: LoRaCapabilities,
  region: RegionCode | undefined,
  preset: ModemPreset,
): boolean {
  return getAllowedPresets(caps, region).includes(preset);
}

export function isRegionAllowed(
  caps: LoRaCapabilities,
  region: RegionCode,
): boolean {
  return getAllowedRegions(caps).includes(region);
}

/** The firmware's default preset for `region`, when the device says. */
export function getDefaultPreset(
  regionPresets: RegionPresetMap | undefined,
  region: RegionCode | undefined,
): ModemPreset | undefined {
  return getRegionPresetGroup(regionPresets, region)?.defaultPreset;
}

/** Regions whose preset group is for licensed (amateur) operators only. */
export function getLicensedOnlyRegions(
  regionPresets: RegionPresetMap | undefined,
): RegionCode[] {
  if (!regionPresets) return [];
  return regionPresets.regionGroups
    .filter((r) => regionPresets.groups[r.groupIndex]?.licensedOnly)
    .map((r) => r.region);
}

/**
 * Subset of a protobuf enum object holding only `allowed` values, in enum
 * order. `keep` stays in even when not allowed, so a select still shows the
 * value the device currently has (validation then flags it).
 */
export function pickEnumValues(
  enumObj: Record<string, string | number>,
  allowed: readonly number[],
  keep?: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, val] of Object.entries(enumObj)) {
    if (typeof val !== "number") continue;
    if (allowed.includes(val) || val === keep) out[key] = val;
  }
  return out;
}
