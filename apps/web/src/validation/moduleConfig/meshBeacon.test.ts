import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import {
  beaconBroadcastGate,
  DEFAULT_TARGET,
  fromMeshBeaconForm,
  MESH_BEACON_MESSAGE_MAX_BYTES,
  type MeshBeaconValidation,
  MeshBeaconValidationSchema,
  OFFER_CHANNEL_KEEP,
  selectTargetChannel,
  TARGET_DEFAULT,
  toMeshBeaconForm,
} from "./meshBeacon.ts";

const Flags = Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfig_Flags;
const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;
const BeaconSchema = Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfigSchema;
const TargetSchema =
  Protobuf.ModuleConfig.ModuleConfig_MeshBeaconConfig_BroadcastTargetSchema;

const valid: MeshBeaconValidation = {
  region: Region.US,
  listenEnabled: true,
  broadcastEnabled: true,
  broadcastMessage: "Join us",
  broadcastIntervalSecs: 3600,
  offerChannel: 0,
  broadcastTargets: [{ ...DEFAULT_TARGET }],
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

const lora = create(Protobuf.Config.Config_LoRaConfigSchema, {
  region: Region.US,
  usePreset: true,
  modemPreset: Preset.MEDIUM_FAST,
});
const customLora = create(Protobuf.Config.Config_LoRaConfigSchema, {
  region: Region.US,
  usePreset: false,
  modemPreset: Preset.LONG_FAST,
});

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

  it("limits the offered channel to the eight slots and the keep sentinel", () => {
    const parse = (offerChannel: number) =>
      MeshBeaconValidationSchema.safeParse({ ...valid, offerChannel }).success;
    expect(parse(OFFER_CHANNEL_KEEP)).toBe(true);
    expect(parse(0)).toBe(true);
    expect(parse(7)).toBe(true);
    expect(parse(-1)).toBe(false);
    expect(parse(8)).toBe(false);
  });

  it("needs at least one target, each Default or a real channel and preset", () => {
    const parse = (broadcastTargets: unknown) =>
      MeshBeaconValidationSchema.safeParse({ ...valid, broadcastTargets })
        .success;
    expect(parse([])).toBe(false);
    expect(parse([{ channelIndex: 3, preset: Preset.SHORT_FAST }])).toBe(true);
    expect(parse([{ channelIndex: 8, preset: TARGET_DEFAULT }])).toBe(false);
    expect(parse([{ channelIndex: TARGET_DEFAULT, preset: 999 }])).toBe(false);
  });
});

describe("toMeshBeaconForm", () => {
  it("unpacks the flag bits and shows the radio's region", () => {
    const form = toMeshBeaconForm(
      create(BeaconSchema, { flags: Flags.FLAG_LISTEN_ENABLED }),
      channels,
      lora,
    );
    expect(form.listenEnabled).toBe(true);
    expect(form.broadcastEnabled).toBe(false);
    expect(form.region).toBe(Region.US);
  });

  it("shows the one hour default for an interval never set", () => {
    expect(
      toMeshBeaconForm(undefined, channels, lora).broadcastIntervalSecs,
    ).toBe(3600);
  });

  it("maps the offered channel back to the local slot it came from", () => {
    const config = create(BeaconSchema, {
      broadcastOfferChannel: channel("Club", Array.from(club.psk)),
    });
    expect(toMeshBeaconForm(config, channels, lora).offerChannel).toBe(1);
  });

  it("keeps an offered channel that isn't in the channel table", () => {
    const config = create(BeaconSchema, {
      broadcastOfferChannel: channel("Elsewhere", [9]),
    });
    expect(toMeshBeaconForm(config, channels, lora).offerChannel).toBe(
      OFFER_CHANNEL_KEEP,
    );
  });

  it("shows the primary for an unset offered channel, as a save fills in", () => {
    expect(toMeshBeaconForm(undefined, channels, lora).offerChannel).toBe(0);
  });

  it("seeds one Default target row for an empty list", () => {
    expect(
      toMeshBeaconForm(undefined, channels, lora).broadcastTargets,
    ).toEqual([DEFAULT_TARGET]);
  });

  it("shows stored targets with Default for unset fields", () => {
    const config = create(BeaconSchema, {
      broadcastTargets: [
        create(TargetSchema, { channelIndex: 1 }),
        create(TargetSchema, { preset: Preset.SHORT_FAST }),
      ],
    });
    expect(toMeshBeaconForm(config, channels, lora).broadcastTargets).toEqual([
      { channelIndex: 1, preset: TARGET_DEFAULT },
      { channelIndex: TARGET_DEFAULT, preset: Preset.SHORT_FAST },
    ]);
  });
});

describe("fromMeshBeaconForm", () => {
  const base = create(BeaconSchema, {
    // The legacy-split bit and one this client doesn't know about.
    flags: Flags.FLAG_BROADCAST_ENABLED | Flags.FLAG_LEGACY_SPLIT | 64,
    broadcastMessage: "Stored",
    broadcastIntervalSecs: 7200,
    broadcastOfferChannel: channel("Elsewhere", [9]),
    broadcastOfferRegion: Region.EU_868,
    broadcastOfferPreset: Preset.LONG_SLOW,
    broadcastTargets: [create(TargetSchema, { channelIndex: 1 })],
  });

  it("packs the flags and keeps bits it doesn't own", () => {
    const config = fromMeshBeaconForm(
      { ...valid, broadcastEnabled: false },
      base,
      channels,
      lora,
    );
    expect(config.flags).toBe(
      Flags.FLAG_LISTEN_ENABLED | Flags.FLAG_LEGACY_SPLIT | 64,
    );
  });

  it("stamps the radio's region and preset over stored values", () => {
    const config = fromMeshBeaconForm(valid, base, channels, lora);
    expect(config.broadcastOfferRegion).toBe(Region.US);
    expect(config.broadcastOfferPreset).toBe(Preset.MEDIUM_FAST);
    expect(config.broadcastMessage).toBe("Join us");
    expect(config.broadcastIntervalSecs).toBe(3600);
  });

  it("copies only the name and key of the chosen channel", () => {
    const config = fromMeshBeaconForm(
      { ...valid, offerChannel: 1 },
      base,
      [
        primary,
        create(Protobuf.Channel.ChannelSettingsSchema, {
          ...club,
          uplinkEnabled: true,
        }),
      ],
      lora,
    );
    expect(config.broadcastOfferChannel?.name).toBe("Club");
    expect(config.broadcastOfferChannel?.psk).toEqual(club.psk);
    expect(config.broadcastOfferChannel?.uplinkEnabled).toBe(false);
  });

  it("keeps an offered channel the radio doesn't have", () => {
    expect(
      fromMeshBeaconForm(
        { ...valid, offerChannel: OFFER_CHANNEL_KEEP },
        base,
        channels,
        lora,
      ).broadcastOfferChannel?.name,
    ).toBe("Elsewhere");
  });

  it("falls back to the primary when the chosen slot is empty", () => {
    const config = fromMeshBeaconForm(
      { ...valid, offerChannel: 3 },
      undefined,
      channels,
      lora,
    );
    expect(config.broadcastOfferChannel?.psk).toEqual(primary.psk);
  });

  it("keeps an empty list empty when its Default row is untouched", () => {
    const empty = create(BeaconSchema, { flags: Flags.FLAG_BROADCAST_ENABLED });
    expect(
      fromMeshBeaconForm(valid, empty, channels, lora).broadcastTargets,
    ).toEqual([]);
  });

  it("keeps a stored Default target when another field changes", () => {
    const withDefault = create(BeaconSchema, {
      broadcastTargets: [create(TargetSchema, { region: Region.US })],
    });
    const form = toMeshBeaconForm(withDefault, channels, lora);
    const config = fromMeshBeaconForm(
      { ...form, listenEnabled: !form.listenEnabled },
      withDefault,
      channels,
      lora,
    );
    expect(config.broadcastTargets).toHaveLength(1);
    expect(config.broadcastTargets[0]?.channelIndex).toBeUndefined();
  });

  it("keeps fields it doesn't show on a target the user didn't change", () => {
    const withSlot = create(BeaconSchema, {
      broadcastTargets: [
        create(TargetSchema, {
          channelIndex: 1,
          region: Region.EU_868,
          frequencySlot: 3,
        }),
      ],
    });
    const form = toMeshBeaconForm(withSlot, channels, lora);
    const [kept] = fromMeshBeaconForm(
      form,
      withSlot,
      channels,
      lora,
    ).broadcastTargets;
    expect(kept?.frequencySlot).toBe(3);
    expect(kept?.region).toBe(Region.US);
  });

  it("saves targets with the radio's region and unset Defaults", () => {
    const config = fromMeshBeaconForm(
      {
        ...valid,
        broadcastTargets: [
          { channelIndex: 1, preset: Preset.SHORT_FAST },
          { ...DEFAULT_TARGET },
        ],
      },
      base,
      channels,
      lora,
    );
    expect(
      config.broadcastTargets.map((t) => ({
        region: t.region,
        channelIndex: t.channelIndex,
        preset: t.preset,
      })),
    ).toEqual([
      { region: Region.US, channelIndex: 1, preset: Preset.SHORT_FAST },
      { region: Region.US, channelIndex: undefined, preset: undefined },
    ]);
  });

  it("keeps every broadcast field on custom LoRa settings", () => {
    const config = fromMeshBeaconForm(
      {
        ...valid,
        broadcastEnabled: false,
        broadcastMessage: "Changed",
        offerChannel: 1,
      },
      base,
      channels,
      customLora,
    );
    expect(config.flags & Flags.FLAG_BROADCAST_ENABLED).toBe(0);
    expect(config.broadcastMessage).toBe("Stored");
    expect(config.broadcastIntervalSecs).toBe(7200);
    expect(config.broadcastOfferChannel?.name).toBe("Elsewhere");
    expect(config.broadcastOfferRegion).toBe(Region.EU_868);
    expect(config.broadcastOfferPreset).toBe(Preset.LONG_SLOW);
    expect(config.broadcastTargets[0]?.channelIndex).toBe(1);
  });

  it("never sends the frequency slot firmware 2.8.1 doesn't know", () => {
    const withSlot = create(BeaconSchema, { broadcastOfferFrequencySlot: 5 });
    expect(
      fromMeshBeaconForm(valid, withSlot, channels, lora)
        .broadcastOfferFrequencySlot,
    ).toBeUndefined();
  });

  it("round-trips through the form", () => {
    const form = {
      ...valid,
      offerChannel: 1,
      broadcastTargets: [{ channelIndex: 1, preset: Preset.SHORT_FAST }],
    };
    const config = fromMeshBeaconForm(form, undefined, channels, lora);
    expect(toMeshBeaconForm(config, channels, lora)).toEqual(form);
  });
});

describe("selectTargetChannel", () => {
  it("preselects the radio's preset the first time a row gets a channel", () => {
    expect(
      selectTargetChannel({ ...DEFAULT_TARGET }, 1, Preset.MEDIUM_FAST),
    ).toEqual({ channelIndex: 1, preset: Preset.MEDIUM_FAST });
  });

  it("keeps a preset the user chose", () => {
    expect(
      selectTargetChannel(
        { channelIndex: 1, preset: Preset.SHORT_FAST },
        2,
        Preset.MEDIUM_FAST,
      ),
    ).toEqual({ channelIndex: 2, preset: Preset.SHORT_FAST });
  });

  it("leaves the preset alone when Default is picked", () => {
    expect(
      selectTargetChannel(
        { channelIndex: 1, preset: TARGET_DEFAULT },
        TARGET_DEFAULT,
        Preset.MEDIUM_FAST,
      ),
    ).toEqual(DEFAULT_TARGET);
  });
});

describe("beaconBroadcastGate", () => {
  it("shows and enables everything on a standard preset", () => {
    expect(beaconBroadcastGate(true, false)).toEqual({
      sectionsVisible: true,
      sectionsEnabled: true,
      toggleEnabled: true,
    });
  });

  it("on custom settings, only lets a broadcasting radio turn it off", () => {
    expect(beaconBroadcastGate(false, true)).toEqual({
      sectionsVisible: true,
      sectionsEnabled: false,
      toggleEnabled: true,
    });
    expect(beaconBroadcastGate(false, false)).toEqual({
      sectionsVisible: false,
      sectionsEnabled: false,
      toggleEnabled: false,
    });
  });
});
