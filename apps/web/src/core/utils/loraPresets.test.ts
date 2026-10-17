import { makeLoRaValidationSchema } from "@app/validation/config/lora.ts";
import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import {
  getAllowedPresets,
  getAllowedRegions,
  getDefaultPreset,
  getLicensedOnlyRegions,
  pickEnumValues,
} from "./loraPresets.ts";

const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;

const regionPresets = create(Protobuf.Mesh.LoRaRegionPresetMapSchema, {
  groups: [
    {
      presets: [Preset.LONG_FAST, Preset.LONG_TURBO, Preset.MEDIUM_TURBO],
      defaultPreset: Preset.LONG_TURBO,
    },
    {
      presets: [Preset.TINY_FAST, Preset.TINY_SLOW],
      defaultPreset: Preset.TINY_FAST,
      licensedOnly: true,
    },
  ],
  regionGroups: [
    { region: Region.US, groupIndex: 0 },
    { region: Region.ITU1_2M, groupIndex: 1 },
  ],
});

const fw28 = { regionPresets, supportsFirmware28: true };
const fw27 = { supportsFirmware28: false };

describe("getAllowedPresets", () => {
  it("offers only the presets of the region's group", () => {
    expect(getAllowedPresets(fw28, Region.US)).toEqual([
      Preset.LONG_FAST,
      Preset.LONG_TURBO,
      Preset.MEDIUM_TURBO,
    ]);
    expect(getAllowedPresets(fw28, Region.ITU1_2M)).toEqual([
      Preset.TINY_FAST,
      Preset.TINY_SLOW,
    ]);
  });

  it("does not restrict a region missing from the map", () => {
    const presets = getAllowedPresets(fw28, Region.EU_868);
    expect(presets).toContain(Preset.SHORT_TURBO);
    expect(presets).toContain(Preset.MEDIUM_TURBO);
  });

  it("hides 2.8-only presets on older firmware", () => {
    const presets = getAllowedPresets(fw27, Region.US);
    expect(presets).toContain(Preset.LONG_FAST);
    expect(presets).toContain(Preset.LONG_TURBO);
    for (const p of [
      Preset.TINY_FAST,
      Preset.TINY_SLOW,
      Preset.MEDIUM_TURBO,
      Preset.LITE_FAST,
      Preset.LITE_SLOW,
      Preset.NARROW_FAST,
      Preset.NARROW_SLOW,
    ]) {
      expect(presets).not.toContain(p);
    }
  });

  it("shows every preset on 2.8 firmware without a map", () => {
    const presets = getAllowedPresets({ supportsFirmware28: true }, Region.US);
    expect(presets).toContain(Preset.TINY_FAST);
    expect(presets).toContain(Preset.MEDIUM_TURBO);
  });
});

describe("getAllowedRegions", () => {
  it("hides 2.8-only regions on older firmware", () => {
    const regions = getAllowedRegions(fw27);
    expect(regions).toContain(Region.US);
    expect(regions).toContain(Region.EU_868);
    expect(regions).not.toContain(Region.EU_866);
    expect(regions).not.toContain(Region.ITU1_70CM);
    expect(regions).not.toContain(Region.ITU2_125CM);
  });

  it("shows them on 2.8 firmware", () => {
    const regions = getAllowedRegions(fw28);
    expect(regions).toContain(Region.EU_866);
    expect(regions).toContain(Region.ITU2_125CM);
  });
});

describe("region defaults and licensing", () => {
  it("reads the region's default preset", () => {
    expect(getDefaultPreset(regionPresets, Region.US)).toBe(Preset.LONG_TURBO);
    expect(getDefaultPreset(regionPresets, Region.EU_868)).toBeUndefined();
    expect(getDefaultPreset(undefined, Region.US)).toBeUndefined();
  });

  it("lists licensed-only regions", () => {
    expect(getLicensedOnlyRegions(regionPresets)).toEqual([Region.ITU1_2M]);
    expect(getLicensedOnlyRegions(undefined)).toEqual([]);
  });
});

describe("pickEnumValues", () => {
  it("keeps allowed values and the current one", () => {
    expect(
      pickEnumValues(Preset, [Preset.LONG_FAST], Preset.SHORT_FAST),
    ).toEqual({ LONG_FAST: Preset.LONG_FAST, SHORT_FAST: Preset.SHORT_FAST });
  });
});

describe("makeLoRaValidationSchema", () => {
  const base = {
    usePreset: true,
    modemPreset: Preset.LONG_FAST,
    bandwidth: 0,
    spreadFactor: 0,
    codingRate: 0,
    frequencyOffset: 0,
    region: Region.US,
    hopLimit: 3,
    txEnabled: true,
    txPower: 0,
    channelNum: 0,
    overrideDutyCycle: false,
    sx126xRxBoostedGain: false,
    overrideFrequency: 0,
    ignoreIncoming: [],
    ignoreMqtt: false,
    configOkToMqtt: false,
    femLnaMode: 0,
    serialHalOnly: false,
  };

  const issuePaths = (
    caps: Parameters<typeof makeLoRaValidationSchema>[0],
    data: object,
  ) => {
    const result = makeLoRaValidationSchema(caps).safeParse({
      ...base,
      ...data,
    });
    return result.success
      ? []
      : result.error.issues.map((i) => i.path.join("."));
  };

  it("accepts a preset legal in the region", () => {
    expect(issuePaths(fw28, { modemPreset: Preset.LONG_TURBO })).toEqual([]);
  });

  it("rejects a preset not legal in the region", () => {
    expect(issuePaths(fw28, { modemPreset: Preset.SHORT_TURBO })).toEqual([
      "modemPreset",
    ]);
  });

  it("ignores the preset when presets are off", () => {
    expect(
      issuePaths(fw28, { usePreset: false, modemPreset: Preset.SHORT_TURBO }),
    ).toEqual([]);
  });

  it("rejects 2.8-only presets and regions on older firmware", () => {
    expect(issuePaths(fw27, { modemPreset: Preset.TINY_FAST })).toEqual([
      "modemPreset",
    ]);
    expect(issuePaths(fw27, { region: Region.EU_866 })).toEqual(["region"]);
  });
});
