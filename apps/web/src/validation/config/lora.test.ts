import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import {
  codingRateOverride,
  codingRateOverrides,
  hasPaFan,
  LoRaValidationSchema,
  normalizeCodingRate,
} from "./lora.ts";

describe("LoRa modem presets", () => {
  it("includes LONG_TURBO modem preset", () => {
    expect(
      Object.prototype.hasOwnProperty.call(
        Protobuf.Config.Config_LoRaConfig_ModemPreset,
        "LONG_TURBO",
      ),
    ).toBe(true);
  });
});

const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const Hw = Protobuf.Mesh.HardwareModel;

describe("coding rate override", () => {
  it("offers only the rates above the preset's own", () => {
    expect(codingRateOverrides(Preset.LONG_FAST)).toEqual([6, 7, 8]);
    expect(codingRateOverrides(Preset.NARROW_FAST)).toEqual([7, 8]);
    expect(codingRateOverrides(Preset.LONG_SLOW)).toEqual([]);
  });

  it("reads a stored rate as firmware applies it", () => {
    expect(codingRateOverride(Preset.LONG_FAST, 7)).toBe(7);
    // At or below the preset's own rate firmware ignores it.
    expect(codingRateOverride(Preset.LONG_FAST, 5)).toBe(0);
    expect(codingRateOverride(Preset.LONG_SLOW, 8)).toBe(0);
    expect(codingRateOverride(Preset.MEDIUM_FAST, 0)).toBe(0);
  });

  it("normalizes the coding rate only while presets are on", () => {
    expect(
      normalizeCodingRate({
        usePreset: true,
        modemPreset: Preset.MEDIUM_FAST,
        codingRate: 7,
      }).codingRate,
    ).toBe(7);
    expect(
      normalizeCodingRate({
        usePreset: true,
        modemPreset: Preset.LONG_FAST,
        codingRate: 5,
      }).codingRate,
    ).toBe(0);
    const manual = {
      usePreset: false,
      modemPreset: Preset.LONG_FAST,
      codingRate: 5,
    };
    expect(normalizeCodingRate(manual)).toBe(manual);
  });
});

describe("hasPaFan", () => {
  it("shows the PA fan switch for boards with a fan or an unknown model", () => {
    expect(hasPaFan(undefined)).toBe(true);
    expect(hasPaFan(Hw.UNSET)).toBe(true);
    expect(hasPaFan(Hw.BETAFPV_2400_TX)).toBe(true);
    expect(hasPaFan(Hw.RADIOMASTER_900_BANDIT_NANO)).toBe(true);
    expect(hasPaFan(Hw.RADIOMASTER_900_BANDIT)).toBe(true);
  });

  it("hides it for other boards", () => {
    expect(hasPaFan(Hw.HELTEC_V3)).toBe(false);
    expect(hasPaFan(Hw.TBEAM)).toBe(false);
  });
});

describe("LoRaValidationSchema", () => {
  const base = {
    usePreset: true,
    modemPreset: Preset.LONG_FAST,
    bandwidth: 0,
    spreadFactor: 0,
    codingRate: 0,
    region: Protobuf.Config.Config_LoRaConfig_RegionCode.US,
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
  };

  it("drops the fields the page no longer shows, keeping the device's values", () => {
    const result = LoRaValidationSchema.safeParse({
      ...base,
      frequencyOffset: 12,
      femLnaMode: 1,
      serialHalOnly: true,
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("frequencyOffset");
    expect(result.data).not.toHaveProperty("femLnaMode");
    expect(result.data).not.toHaveProperty("serialHalOnly");
  });

  it("keeps paFanDisabled, defaulting to false", () => {
    expect(LoRaValidationSchema.parse(base).paFanDisabled).toBe(false);
    expect(
      LoRaValidationSchema.parse({ ...base, paFanDisabled: true })
        .paFanDisabled,
    ).toBe(true);
  });
});
