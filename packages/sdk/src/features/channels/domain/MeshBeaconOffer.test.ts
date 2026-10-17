import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import {
  beaconJoinChannelSet,
  beaconJoinOption,
  isBeaconAlreadyJoined,
} from "./MeshBeaconOffer.ts";

const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;

const lora = (
  init: Omit<Partial<Protobuf.Config.Config_LoRaConfig>, "$typeName"> = {},
) =>
  create(Protobuf.Config.Config_LoRaConfigSchema, {
    usePreset: true,
    modemPreset: Preset.LONG_FAST,
    region: Region.US,
    ...init,
  });

const channel = (name: string, psk = new Uint8Array([1])) =>
  create(Protobuf.Channel.ChannelSettingsSchema, { name, psk });

const beacon = (
  init: Omit<Partial<Protobuf.MeshBeacon.MeshBeacon>, "$typeName"> = {},
) =>
  create(Protobuf.MeshBeacon.MeshBeaconSchema, {
    message: "join",
    offerChannel: channel("Hikers", new Uint8Array([7, 7])),
    ...init,
  });

describe("beaconJoinOption", () => {
  it("is none without an offered channel", () => {
    expect(
      beaconJoinOption(beacon({ offerChannel: undefined }), lora(), []),
    ).toBe("none");
  });

  it("adds when the offered channel hashes like the primary", () => {
    const radio = [channel("Hikers")];
    expect(beaconJoinOption(beacon(), lora(), radio)).toBe("add");
  });

  it("treats an empty name as the preset name on both sides", () => {
    const offer = beacon({ offerChannel: channel("") });
    expect(beaconJoinOption(offer, lora(), [channel("")])).toBe("add");
    expect(beaconJoinOption(offer, lora(), [channel("LongFast")])).toBe("add");
  });

  it("switches when the preset or region differ", () => {
    const radio = [channel("Hikers")];
    expect(
      beaconJoinOption(
        beacon({ offerPreset: Preset.SHORT_FAST }),
        lora(),
        radio,
      ),
    ).toBe("switch");
    expect(
      beaconJoinOption(beacon({ offerRegion: Region.EU_868 }), lora(), radio),
    ).toBe("switch");
  });

  it("switches when the radio is pinned to a slot", () => {
    expect(
      beaconJoinOption(beacon(), lora({ channelNum: 5 }), [channel("Hikers")]),
    ).toBe("switch");
  });

  it("switches when the names differ, since the slots may", () => {
    expect(beaconJoinOption(beacon(), lora(), [channel("LongFast")])).toBe(
      "switch",
    );
  });
});

describe("beaconJoinChannelSet", () => {
  it("turns position sharing off on the offered channel", () => {
    const offered = channel("Hikers");
    offered.moduleSettings = create(Protobuf.Channel.ModuleSettingsSchema, {
      positionPrecision: 32,
    });
    const set = beaconJoinChannelSet(
      beacon({ offerChannel: offered }),
      "add",
      lora(),
    );
    expect(set?.settings[0]?.moduleSettings?.positionPrecision).toBe(0);
    expect(set?.loraConfig).toBeUndefined();
  });

  it("switches with a fresh LoRa config carrying the offered preset", () => {
    const set = beaconJoinChannelSet(
      beacon({ offerPreset: Preset.MEDIUM_FAST }),
      "switch",
      lora({ channelNum: 9, overrideFrequency: 915 }),
    );
    expect(set?.loraConfig?.modemPreset).toBe(Preset.MEDIUM_FAST);
    expect(set?.loraConfig?.region).toBe(Region.US);
    expect(set?.loraConfig?.channelNum).toBe(0);
    expect(set?.loraConfig?.overrideFrequency).toBe(0);
  });
});

describe("isBeaconAlreadyJoined", () => {
  it("matches a channel with the same name and key", () => {
    const radio = [channel(""), channel("Hikers", new Uint8Array([7, 7]))];
    expect(isBeaconAlreadyJoined(beacon(), lora(), radio)).toBe(true);
  });

  it("does not match the same name with a different key", () => {
    const radio = [channel(""), channel("Hikers", new Uint8Array([8]))];
    expect(isBeaconAlreadyJoined(beacon(), lora(), radio)).toBe(false);
  });
});
