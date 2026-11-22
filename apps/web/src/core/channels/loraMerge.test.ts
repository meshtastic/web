import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { describe, expect, it } from "vitest";
import { mergeLinkLora } from "./loraMerge.ts";

const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;
const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const schema = Protobuf.Config.Config_LoRaConfigSchema;

const radio = create(schema, {
  region: Region.EU_868,
  usePreset: true,
  modemPreset: Preset.LONG_FAST,
  hopLimit: 5,
  txEnabled: true,
  txPower: 20,
  sx126xRxBoostedGain: true,
  channelNum: 7,
  overrideFrequency: 869.5,
});

describe("mergeLinkLora", () => {
  it("takes the link's modem settings", () => {
    const link = create(schema, {
      region: Region.US,
      usePreset: true,
      modemPreset: Preset.MEDIUM_FAST,
      channelNum: 3,
      hopLimit: 4,
    });
    const merged = mergeLinkLora(radio, link);
    expect(merged.region).toBe(Region.US);
    expect(merged.modemPreset).toBe(Preset.MEDIUM_FAST);
    expect(merged.channelNum).toBe(3);
    expect(merged.hopLimit).toBe(4);
    // Zero in the link clears a stale frequency pin.
    expect(merged.overrideFrequency).toBe(0);
  });

  it("keeps the radio's own settings when the link leaves them zero", () => {
    const merged = mergeLinkLora(
      radio,
      create(schema, { usePreset: true, modemPreset: Preset.SHORT_FAST }),
    );
    expect(merged.txEnabled).toBe(true);
    expect(merged.txPower).toBe(20);
    expect(merged.sx126xRxBoostedGain).toBe(true);
    expect(merged.region).toBe(Region.EU_868);
    expect(merged.hopLimit).toBe(5);
  });

  it("does not let a link turn transmit off", () => {
    const merged = mergeLinkLora(radio, create(schema, { txEnabled: false }));
    expect(merged.txEnabled).toBe(true);
  });
});
