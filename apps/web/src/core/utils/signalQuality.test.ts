import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { rssiQuality, snrLimit, snrQuality } from "./signalQuality.ts";

const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;

describe("snrLimit", () => {
  it("follows the preset's spreading factor", () => {
    expect(snrLimit({ modemPreset: Preset.SHORT_FAST })).toBe(-7.5);
    expect(snrLimit({ modemPreset: Preset.LONG_FAST })).toBe(-17.5);
    expect(snrLimit({ modemPreset: Preset.LONG_SLOW })).toBe(-20);
  });

  it("uses the custom spreading factor when the preset is off", () => {
    expect(
      snrLimit({
        modemPreset: Preset.LONG_FAST,
        usePreset: false,
        spreadFactor: 8,
      }),
    ).toBe(-10);
  });

  it("counts unknown settings as LongFast", () => {
    expect(snrLimit()).toBe(-17.5);
    expect(snrLimit({ usePreset: false, spreadFactor: 0 })).toBe(-17.5);
  });
});

describe("snrQuality", () => {
  it("rates the same SNR against each preset's floor", () => {
    expect(snrQuality(-15, { modemPreset: Preset.LONG_SLOW })).toBe("good");
    expect(snrQuality(-15, { modemPreset: Preset.SHORT_FAST })).toBe("bad");
    expect(snrQuality(-16, { modemPreset: Preset.SHORT_FAST })).toBe("none");
  });

  it("bands the margin below the floor", () => {
    const lora = { modemPreset: Preset.LONG_FAST };
    expect(snrQuality(0, lora)).toBe("good");
    expect(snrQuality(-17.5, lora)).toBe("fair");
    expect(snrQuality(-23, lora)).toBe("bad");
    expect(snrQuality(-25, lora)).toBe("bad");
    expect(snrQuality(-25.5, lora)).toBe("none");
  });
});

describe("rssiQuality", () => {
  it("uses the shared RSSI bands", () => {
    expect(rssiQuality(-60)).toBe("good");
    expect(rssiQuality(-115)).toBe("fair");
    expect(rssiQuality(-120)).toBe("bad");
    expect(rssiQuality(-126)).toBe("none");
  });
});
