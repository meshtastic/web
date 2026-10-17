import { create, type MessageInitShape } from "@bufbuild/protobuf";
import type { Channel, MeshBeaconOffer } from "@meshtastic/sdk";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import {
  beaconOfferKey,
  channelSettingsByIndex,
  firstFreeSecondarySlot,
  planBeaconJoin,
} from "./beaconJoin.ts";
import { channelSetFromUrl, channelSetToUrl } from "./channelUrl.ts";

const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;
const Role = Protobuf.Channel.Channel_Role;

const settings = (name: string, psk: number[]) =>
  create(Protobuf.Channel.ChannelSettingsSchema, {
    name,
    psk: new Uint8Array(psk),
  });

const lora = create(Protobuf.Config.Config_LoRaConfigSchema, {
  usePreset: true,
  modemPreset: Preset.LONG_FAST,
  region: Region.US,
  hopLimit: 3,
  txEnabled: true,
});

const key16 = Array.from({ length: 16 }, (_, i) => i + 1);
// Primary on the default name: hashes "LongFast" for its frequency slot.
const primary = settings("", [1]);

const offer = (
  beacon: MessageInitShape<typeof Protobuf.MeshBeacon.MeshBeaconSchema>,
  rxTime = new Date(0),
): MeshBeaconOffer => ({
  from: 0x1234abcd,
  rxTime,
  beacon: create(Protobuf.MeshBeacon.MeshBeaconSchema, beacon),
});

describe("channelSettingsByIndex", () => {
  it("orders by index and leaves disabled or missing slots empty", () => {
    const channels: Channel[] = [
      { index: 2, role: Role.SECONDARY, settings: settings("B", [2]) },
      { index: 0, role: Role.PRIMARY, settings: primary },
      { index: 1, role: Role.DISABLED, settings: settings("Old", [3]) },
    ];
    const byIndex = channelSettingsByIndex(channels);
    expect(byIndex).toHaveLength(8);
    expect(byIndex[0]).toBe(primary);
    expect(byIndex[1]).toBeUndefined();
    expect(byIndex[2]?.name).toBe("B");
    expect(byIndex[3]).toBeUndefined();
  });
});

describe("firstFreeSecondarySlot", () => {
  it("skips the primary and treats blank settings as free", () => {
    expect(
      firstFreeSecondarySlot([primary, settings("A", [1]), settings("", [])]),
    ).toBe(2);
    expect(
      firstFreeSecondarySlot(
        Array.from({ length: 8 }, (_, i) => settings(`C${i}`, [i])),
      ),
    ).toBeUndefined();
  });
});

describe("planBeaconJoin", () => {
  it("adds a channel on the same slot in the first free secondary slot", () => {
    // Same effective name as our primary, different key: same frequency slot.
    const plan = planBeaconJoin(
      offer({ offerChannel: settings("", key16) }),
      lora,
      [primary, settings("Mine", [4])],
    );
    expect(plan?.option).toBe("add");
    expect(plan?.indices).toEqual([2]);
    expect(plan?.noFreeSlot).toBe(false);

    const set = channelSetFromUrl(plan?.url ?? "");
    expect(set.loraConfig).toBeUndefined();
    expect(set.settings).toHaveLength(1);
    expect(Array.from(set.settings[0]?.psk ?? [])).toEqual(key16);
    expect(set.settings[0]?.moduleSettings?.positionPrecision).toBe(0);
  });

  it("asks for a slot when an add finds every secondary slot in use", () => {
    const full = [
      primary,
      ...Array.from({ length: 7 }, (_, i) => settings(`C${i}`, [i + 2])),
    ];
    const plan = planBeaconJoin(
      offer({ offerChannel: settings("", key16) }),
      lora,
      full,
    );
    expect(plan?.option).toBe("add");
    expect(plan?.indices).toEqual([-1]);
    expect(plan?.noFreeSlot).toBe(true);
  });

  it("switches onto another preset, replacing the primary and the LoRa config", () => {
    const plan = planBeaconJoin(
      offer({
        offerChannel: settings("Club", key16),
        offerPreset: Preset.SHORT_FAST,
        offerRegion: Region.EU_868,
      }),
      lora,
      [primary],
    );
    expect(plan?.option).toBe("switch");
    expect(plan?.indices).toEqual([0]);

    const set = channelSetFromUrl(plan?.url ?? "");
    expect(set.settings[0]?.name).toBe("Club");
    expect(set.settings[0]?.moduleSettings?.positionPrecision).toBe(0);
    expect(set.loraConfig?.usePreset).toBe(true);
    expect(set.loraConfig?.modemPreset).toBe(Preset.SHORT_FAST);
    expect(set.loraConfig?.region).toBe(Region.EU_868);
    expect(set.loraConfig?.txEnabled).toBe(true);
  });

  it("switches for a channel name that hashes to another slot", () => {
    const plan = planBeaconJoin(
      offer({ offerChannel: settings("Club", key16) }),
      lora,
      [primary],
    );
    expect(plan?.option).toBe("switch");
    // No region offered: keep ours rather than send UNSET.
    expect(channelSetFromUrl(plan?.url ?? "").loraConfig?.region).toBe(
      Region.US,
    );
  });

  it("skips an offer for a channel the radio already has", () => {
    expect(
      planBeaconJoin(offer({ offerChannel: settings("Club", key16) }), lora, [
        primary,
        settings("Club", key16),
      ]),
    ).toBeUndefined();
  });

  it("skips an offer with no channel", () => {
    expect(planBeaconJoin(offer({ message: "hi" }), lora, [primary])).toBe(
      undefined,
    );
  });
});

describe("beaconOfferKey", () => {
  it("is the same for a rebroadcast and differs when the offer changes", () => {
    const a = offer({ offerChannel: settings("Club", key16) }, new Date(1));
    const b = offer({ offerChannel: settings("Club", key16) }, new Date(2));
    const c = offer({ offerChannel: settings("Other", key16) }, new Date(1));
    expect(beaconOfferKey(a)).toBe(beaconOfferKey(b));
    expect(beaconOfferKey(a)).not.toBe(beaconOfferKey(c));
  });
});

describe("channel URLs", () => {
  it("round-trips a ChannelSet through a base64url fragment", () => {
    const set = create(Protobuf.AppOnly.ChannelSetSchema, {
      settings: [settings("Club", key16)],
      loraConfig: lora,
    });
    const url = channelSetToUrl(set);
    expect(url).toMatch(/^https:\/\/meshtastic\.org\/e\/#[A-Za-z0-9_-]+$/);
    const back = channelSetFromUrl(url);
    expect(back.settings[0]?.name).toBe("Club");
    expect(back.loraConfig?.modemPreset).toBe(Preset.LONG_FAST);
    expect(channelSetToUrl(set, { add: true })).toContain("/e/?add=true#");
  });

  it("rejects anything that isn't a channel URL", () => {
    expect(() => channelSetFromUrl("not a url")).toThrow();
    expect(() => channelSetFromUrl("https://example.com/x#abc")).toThrow();
    expect(() => channelSetFromUrl("https://meshtastic.org/e/")).toThrow();
  });
});
