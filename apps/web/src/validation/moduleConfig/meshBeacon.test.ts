import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import {
  fromMeshBeaconForm,
  MESH_BEACON_MESSAGE_MAX_BYTES,
  type MeshBeaconValidation,
  MeshBeaconValidationSchema,
  OFFER_CHANNEL_KEEP,
  OFFER_CHANNEL_NONE,
  OFFER_PRESET_UNSET,
  toMeshBeaconForm,
} from "./meshBeacon.ts";

const Flags = Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfig_Flags;
const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;

const valid: MeshBeaconValidation = {
  listenEnabled: true,
  broadcastEnabled: true,
  legacySplit: false,
  broadcastMessage: "Join us",
  broadcastIntervalSecs: 3600,
  offerChannel: 0,
  broadcastOfferRegion: Region.US,
  broadcastOfferPreset: OFFER_PRESET_UNSET,
};

const channel = (name: string, psk: number[]) =>
  create(Protobuf.Channel.ChannelSettingsSchema, {
    name,
    psk: new Uint8Array(psk),
  });

const primary = channel("", [1]);
const club = channel(
  "Club",
  Array.from({ length: 16 }, (_, i) => i),
);
const channels = [primary, club, undefined, undefined];

describe("MeshBeaconValidationSchema", () => {
  it("accepts a valid config", () => {
    expect(MeshBeaconValidationSchema.safeParse(valid).success).toBe(true);
  });

  it("allows the 100 byte message firmware 2.8.1 accepts, not the newer 60", () => {
    const ok = "a".repeat(MESH_BEACON_MESSAGE_MAX_BYTES);
    expect(MESH_BEACON_MESSAGE_MAX_BYTES).toBe(100);
    expect(
      MeshBeaconValidationSchema.safeParse({ ...valid, broadcastMessage: ok })
        .success,
    ).toBe(true);
    expect(
      MeshBeaconValidationSchema.safeParse({
        ...valid,
        broadcastMessage: `${ok}a`,
      }).success,
    ).toBe(false);
  });

  it("counts the message limit in UTF-8 bytes", () => {
    // 34 three-byte characters: 34 characters but 102 bytes.
    const result = MeshBeaconValidationSchema.safeParse({
      ...valid,
      broadcastMessage: "€".repeat(34),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "formValidation.tooBig.bytes",
    );
  });

  it("rejects an interval under one hour", () => {
    expect(
      MeshBeaconValidationSchema.safeParse({
        ...valid,
        broadcastIntervalSecs: 3599,
      }).success,
    ).toBe(false);
  });

  it("accepts an unset preset or a real one, nothing else", () => {
    const parse = (broadcastOfferPreset: number) =>
      MeshBeaconValidationSchema.safeParse({ ...valid, broadcastOfferPreset })
        .success;
    expect(parse(OFFER_PRESET_UNSET)).toBe(true);
    expect(parse(Preset.MEDIUM_FAST)).toBe(true);
    expect(parse(999)).toBe(false);
  });

  it("limits the offered channel to the eight slots and the two sentinels", () => {
    const parse = (offerChannel: number) =>
      MeshBeaconValidationSchema.safeParse({ ...valid, offerChannel }).success;
    expect(parse(OFFER_CHANNEL_KEEP)).toBe(true);
    expect(parse(OFFER_CHANNEL_NONE)).toBe(true);
    expect(parse(7)).toBe(true);
    expect(parse(8)).toBe(false);
    expect(parse(-3)).toBe(false);
  });
});

describe("toMeshBeaconForm", () => {
  it("unpacks the flag bits", () => {
    const form = toMeshBeaconForm(
      create(Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfigSchema, {
        flags: Flags.FLAG_LISTEN_ENABLED | Flags.FLAG_LEGACY_SPLIT,
      }),
      channels,
    );
    expect(form.listenEnabled).toBe(true);
    expect(form.broadcastEnabled).toBe(false);
    expect(form.legacySplit).toBe(true);
  });

  it("shows the one hour default for an interval never set", () => {
    expect(toMeshBeaconForm(undefined, channels).broadcastIntervalSecs).toBe(
      3600,
    );
  });

  it("maps the offered channel back to the local slot it came from", () => {
    const config = create(
      Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfigSchema,
      { broadcastOfferChannel: channel("Club", Array.from(club.psk)) },
    );
    expect(toMeshBeaconForm(config, channels).offerChannel).toBe(1);
  });

  it("keeps an offered channel that isn't in the channel table", () => {
    const config = create(
      Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfigSchema,
      { broadcastOfferChannel: channel("Elsewhere", [9]) },
    );
    expect(toMeshBeaconForm(config, channels).offerChannel).toBe(
      OFFER_CHANNEL_KEEP,
    );
  });

  it("reports no offered channel and no preset when unset", () => {
    const form = toMeshBeaconForm(undefined, channels);
    expect(form.offerChannel).toBe(OFFER_CHANNEL_NONE);
    expect(form.broadcastOfferPreset).toBe(OFFER_PRESET_UNSET);
  });
});

describe("fromMeshBeaconForm", () => {
  const base = create(
    Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfigSchema,
    {
      // A flag bit this client doesn't know about.
      flags: Flags.FLAG_BROADCAST_ENABLED | 64,
      broadcastOfferChannel: channel("Elsewhere", [9]),
      broadcastTargets: [
        create(
          Protobuf.ModuleConfig
            .ModuleConfig_MeshBeaconConfig_BroadcastTargetSchema,
          { channelIndex: 1 },
        ),
      ],
    },
  );

  it("packs the flags and keeps bits it doesn't own", () => {
    const config = fromMeshBeaconForm(
      { ...valid, broadcastEnabled: false, legacySplit: true },
      base,
      channels,
    );
    expect(config.flags).toBe(
      Flags.FLAG_LISTEN_ENABLED | Flags.FLAG_LEGACY_SPLIT | 64,
    );
  });

  it("keeps broadcast targets, which the form doesn't edit", () => {
    const config = fromMeshBeaconForm(valid, base, channels);
    expect(config.broadcastTargets).toHaveLength(1);
    expect(config.broadcastTargets[0]?.channelIndex).toBe(1);
  });

  it("copies only the name and key of the chosen channel", () => {
    const config = fromMeshBeaconForm({ ...valid, offerChannel: 1 }, base, [
      primary,
      create(Protobuf.Channel.ChannelSettingsSchema, {
        ...club,
        uplinkEnabled: true,
      }),
    ]);
    expect(config.broadcastOfferChannel?.name).toBe("Club");
    expect(config.broadcastOfferChannel?.psk).toEqual(club.psk);
    expect(config.broadcastOfferChannel?.uplinkEnabled).toBe(false);
  });

  it("keeps or clears the offered channel", () => {
    expect(
      fromMeshBeaconForm(
        { ...valid, offerChannel: OFFER_CHANNEL_KEEP },
        base,
        channels,
      ).broadcastOfferChannel?.name,
    ).toBe("Elsewhere");
    expect(
      fromMeshBeaconForm(
        { ...valid, offerChannel: OFFER_CHANNEL_NONE },
        base,
        channels,
      ).broadcastOfferChannel,
    ).toBeUndefined();
  });

  it("leaves the preset unset or sets it", () => {
    expect(
      fromMeshBeaconForm(valid, base, channels).broadcastOfferPreset,
    ).toBeUndefined();
    expect(
      fromMeshBeaconForm(
        { ...valid, broadcastOfferPreset: Preset.SHORT_FAST },
        base,
        channels,
      ).broadcastOfferPreset,
    ).toBe(Preset.SHORT_FAST);
  });

  it("never sends the frequency slot firmware 2.8.1 doesn't know", () => {
    const withSlot = create(
      Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfigSchema,
      { broadcastOfferFrequencySlot: 5 },
    );
    expect(
      fromMeshBeaconForm(valid, withSlot, channels).broadcastOfferFrequencySlot,
    ).toBeUndefined();
  });

  it("round-trips through the form", () => {
    const config = fromMeshBeaconForm(valid, undefined, channels);
    expect(toMeshBeaconForm(config, channels)).toEqual(valid);
  });
});
