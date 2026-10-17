import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { fromByteArray, toByteArray } from "base64-js";
import { describe, expect, it } from "vitest";
import {
  applyChannelNameEdit,
  buildDisabledChannel,
  buildEditedChannel,
  buildNewChannel,
  DEFAULT_PSK,
  draftFromChannel,
  EXISTING_CHANNEL_PSK_STATE,
  enabledChannels,
  firstFreeIndex,
  generatePsk,
  locationSharingIndex,
  markPskEdited,
  NEW_CHANNEL_PSK_STATE,
  normalizePositionPrecision,
  precisionLabelKey,
  securityState,
} from "./channelStaging.ts";

const Role = Protobuf.Channel.Channel_Role;

function makeChannel(
  index: number,
  role: Protobuf.Channel.Channel_Role,
  settings: Partial<Protobuf.Channel.ChannelSettings> = {},
  moduleSettings?: Partial<Protobuf.Channel.ModuleSettings>,
): Protobuf.Channel.Channel {
  return create(Protobuf.Channel.ChannelSchema, {
    index,
    role,
    settings: {
      ...create(Protobuf.Channel.ChannelSettingsSchema),
      ...settings,
      ...(moduleSettings && {
        moduleSettings: {
          ...create(Protobuf.Channel.ModuleSettingsSchema),
          ...moduleSettings,
        },
      }),
    },
  });
}

const key16 = new Uint8Array(16).fill(7);

describe("buildEditedChannel", () => {
  const existing = makeChannel(
    2,
    Role.SECONDARY,
    {
      name: "Friends",
      psk: key16,
      id: 1234,
      channelNum: 5,
      useAead: true,
      uplinkEnabled: false,
      downlinkEnabled: true,
    },
    { positionPrecision: 13, isMuted: true },
  );

  it("is unchanged when nothing was edited", () => {
    const edited = buildEditedChannel(existing, draftFromChannel(existing));
    expect(edited).toEqual(existing);
  });

  it("is unchanged for a channel without module settings", () => {
    const bare = makeChannel(1, Role.SECONDARY, { name: "x", psk: key16 });
    const edited = buildEditedChannel(bare, draftFromChannel(bare));
    expect(edited).toEqual(bare);
    expect(Object.keys(edited.settings ?? {})).toEqual(
      Object.keys(bare.settings ?? {}),
    );
  });

  it("applies the edited fields and keeps the ones the dialog hides", () => {
    const newKey = new Uint8Array(32).fill(9);
    const edited = buildEditedChannel(existing, {
      name: "  Family ",
      psk: fromByteArray(newKey),
      uplinkEnabled: true,
      downlinkEnabled: false,
      positionPrecision: 32,
    });

    expect(edited.index).toBe(2);
    expect(edited.role).toBe(Role.SECONDARY);
    expect(edited.settings?.name).toBe("Family");
    expect(edited.settings?.psk).toEqual(newKey);
    expect(edited.settings?.uplinkEnabled).toBe(true);
    expect(edited.settings?.downlinkEnabled).toBe(false);
    expect(edited.settings?.moduleSettings?.positionPrecision).toBe(32);
    // Not rendered by the dialog: must survive.
    expect(edited.settings?.useAead).toBe(true);
    expect(edited.settings?.id).toBe(1234);
    expect(edited.settings?.channelNum).toBe(5);
    expect(edited.settings?.moduleSettings?.isMuted).toBe(true);
  });

  it("does not modify the existing channel", () => {
    buildEditedChannel(existing, {
      ...draftFromChannel(existing),
      name: "Other",
    });
    expect(existing.settings?.name).toBe("Friends");
  });

  it("keeps the primary role on index 0", () => {
    const primary = makeChannel(0, Role.PRIMARY, { psk: key16 });
    const edited = buildEditedChannel(primary, {
      ...draftFromChannel(primary),
      name: "Main",
    });
    expect(edited.role).toBe(Role.PRIMARY);
  });
});

describe("add and delete", () => {
  it("adds a secondary with the given key and position off", () => {
    const psk = generatePsk();
    const channel = buildNewChannel(3, psk);
    expect(channel.index).toBe(3);
    expect(channel.role).toBe(Role.SECONDARY);
    expect(fromByteArray(channel.settings?.psk ?? new Uint8Array())).toBe(psk);
    expect(channel.settings?.moduleSettings?.positionPrecision).toBe(0);
    expect(channel.settings?.name).toBe("");
  });

  it("stages the dialog's edits on top of a new channel", () => {
    const added = buildEditedChannel(buildNewChannel(1, generatePsk()), {
      name: "New",
      psk: fromByteArray(key16),
      uplinkEnabled: true,
      downlinkEnabled: true,
      positionPrecision: 15,
    });
    expect(added.role).toBe(Role.SECONDARY);
    expect(added.settings?.name).toBe("New");
    expect(added.settings?.moduleSettings?.positionPrecision).toBe(15);
  });

  it("deletes by disabling the slot and clearing its settings", () => {
    const channel = buildDisabledChannel(4);
    expect(channel.index).toBe(4);
    expect(channel.role).toBe(Role.DISABLED);
    expect(channel.settings?.name).toBe("");
    expect(channel.settings?.psk.length).toBe(0);
    expect(channel.settings?.uplinkEnabled).toBe(false);
  });

  it("generates 32 random bytes by default", () => {
    const a = generatePsk();
    expect(toByteArray(a).length).toBe(32);
    expect(generatePsk()).not.toBe(a);
    expect(toByteArray(generatePsk(16)).length).toBe(16);
  });
});

describe("firstFreeIndex and enabledChannels", () => {
  const map = (channels: Protobuf.Channel.Channel[]) =>
    new Map(channels.map((c) => [c.index, c]));

  it("returns the first disabled secondary slot", () => {
    const channels = map([
      makeChannel(0, Role.PRIMARY),
      makeChannel(1, Role.SECONDARY),
      makeChannel(2, Role.DISABLED),
      makeChannel(3, Role.SECONDARY),
    ]);
    expect(firstFreeIndex(channels)).toBe(2);
  });

  it("treats unknown slots as free and never returns 0", () => {
    expect(firstFreeIndex(map([]))).toBe(1);
    expect(firstFreeIndex(map([makeChannel(0, Role.DISABLED)]))).toBe(1);
  });

  it("returns undefined when all 8 are in use", () => {
    const all = map(
      Array.from({ length: 8 }, (_, i) =>
        makeChannel(i, i === 0 ? Role.PRIMARY : Role.SECONDARY),
      ),
    );
    expect(firstFreeIndex(all)).toBeUndefined();
  });

  it("lists enabled channels by index", () => {
    const list = enabledChannels([
      makeChannel(3, Role.SECONDARY),
      makeChannel(2, Role.DISABLED),
      makeChannel(0, Role.PRIMARY),
    ]);
    expect(list.map((c) => c.index)).toEqual([0, 3]);
  });
});

describe("locationSharingIndex", () => {
  const channels = [
    makeChannel(0, Role.PRIMARY, {}, { positionPrecision: 0 }),
    makeChannel(1, Role.DISABLED, {}, { positionPrecision: 32 }),
    makeChannel(2, Role.SECONDARY, {}, { positionPrecision: 13 }),
  ];

  it("uses the first enabled channel with position on (2.6.10+)", () => {
    expect(locationSharingIndex(channels, true)).toBe(2);
  });

  it("only uses the primary on older firmware", () => {
    expect(locationSharingIndex(channels, false)).toBe(-1);
    const primaryOn = [
      makeChannel(0, Role.PRIMARY, {}, { positionPrecision: 32 }),
      ...channels.slice(1),
    ];
    expect(locationSharingIndex(primaryOn, false)).toBe(0);
  });
});

describe("securityState", () => {
  const settings = (
    psk: Uint8Array,
    precision: number,
    uplinkEnabled = false,
  ) =>
    makeChannel(
      0,
      Role.PRIMARY,
      { psk, uplinkEnabled },
      {
        positionPrecision: precision,
      },
    ).settings;

  it("is secure with a 128 or 256 bit key", () => {
    expect(securityState(settings(key16, 32, true))).toBe("secure");
  });

  it("grades low entropy keys by precise location and MQTT", () => {
    const one = new Uint8Array([1]);
    expect(securityState(settings(one, 13))).toBe("insecureNoPrecise");
    expect(securityState(settings(new Uint8Array(), 32))).toBe(
      "insecurePreciseOnly",
    );
    expect(securityState(settings(one, 32, true))).toBe("insecurePreciseMqtt");
  });
});

describe("applyChannelNameEdit", () => {
  const fixedKey = () => "GENERATED";
  const draft = {
    name: "",
    psk: DEFAULT_PSK,
    uplinkEnabled: false,
    downlinkEnabled: false,
    positionPrecision: 0,
  };

  it("generates a key when a new channel with the default key is named", () => {
    const result = applyChannelNameEdit(
      draft,
      "Hiking",
      NEW_CHANNEL_PSK_STATE,
      fixedKey,
    );
    expect(result.draft.psk).toBe("GENERATED");
    expect(result.state.generatedPskForName).toBe(true);
  });

  it("also generates for an empty key", () => {
    const result = applyChannelNameEdit(
      { ...draft, psk: "" },
      "Hiking",
      NEW_CHANNEL_PSK_STATE,
      fixedKey,
    );
    expect(result.draft.psk).toBe("GENERATED");
  });

  it("restores the old key when the name is cleared again", () => {
    const named = applyChannelNameEdit(
      draft,
      "H",
      NEW_CHANNEL_PSK_STATE,
      fixedKey,
    );
    const cleared = applyChannelNameEdit(
      named.draft,
      "",
      named.state,
      fixedKey,
    );
    expect(cleared.draft.psk).toBe(DEFAULT_PSK);
    expect(cleared.state.generatedPskForName).toBe(false);
  });

  it("keeps the generated key while the name keeps changing", () => {
    const first = applyChannelNameEdit(
      draft,
      "H",
      NEW_CHANNEL_PSK_STATE,
      () => "FIRST",
    );
    const second = applyChannelNameEdit(
      first.draft,
      "Hi",
      first.state,
      () => "SECOND",
    );
    expect(second.draft.psk).toBe("FIRST");
  });

  it("never generates for an existing channel", () => {
    const result = applyChannelNameEdit(
      draft,
      "LongFast",
      EXISTING_CHANNEL_PSK_STATE,
      fixedKey,
    );
    expect(result.draft.psk).toBe(DEFAULT_PSK);
    expect(result.draft.name).toBe("LongFast");
  });

  it("does not touch a key the user set", () => {
    const state = markPskEdited(NEW_CHANNEL_PSK_STATE);
    const named = applyChannelNameEdit(draft, "Hiking", state, fixedKey);
    expect(named.draft.psk).toBe(DEFAULT_PSK);
    const cleared = applyChannelNameEdit(
      { ...draft, name: "Hiking", psk: "MINE" },
      "",
      state,
      fixedKey,
    );
    expect(cleared.draft.psk).toBe("MINE");
  });

  it("does not generate when the key is already strong", () => {
    const strong = fromByteArray(key16);
    const result = applyChannelNameEdit(
      { ...draft, psk: strong },
      "Hiking",
      NEW_CHANNEL_PSK_STATE,
      fixedKey,
    );
    expect(result.draft.psk).toBe(strong);
  });
});

describe("position precision helpers", () => {
  it("normalizes device values into 0, 10-19 or 32", () => {
    expect(normalizePositionPrecision(undefined)).toBe(0);
    expect(normalizePositionPrecision(0)).toBe(0);
    expect(normalizePositionPrecision(5)).toBe(10);
    expect(normalizePositionPrecision(14)).toBe(14);
    expect(normalizePositionPrecision(25)).toBe(19);
    expect(normalizePositionPrecision(32)).toBe(32);
  });

  it("maps 10-19 to the distance labels", () => {
    expect(precisionLabelKey(10, true)).toBe(
      "positionPrecision.options.metric_km23",
    );
    expect(precisionLabelKey(19, false)).toBe(
      "positionPrecision.options.imperial_ft150",
    );
  });
});
