import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { channelSetToUrl } from "@core/utils/channelUrl.ts";
import { Result } from "better-result";
import { describe, expect, it } from "vitest";
import {
  canReplace,
  defaultImportMode,
  parseChannelLink,
  planChannelImport,
} from "./channelImport.ts";
import { buildChannelEdits } from "./saves.ts";
import { effectiveChannelPsk } from "@core/channels/channelIdentity.ts";

const Role = Protobuf.Channel.Channel_Role;
const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;
const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;

const settings = (name: string, psk: number[] = [1]) =>
  create(Protobuf.Channel.ChannelSettingsSchema, {
    name,
    psk: new Uint8Array(psk),
  });

const linkLora = create(Protobuf.Config.Config_LoRaConfigSchema, {
  usePreset: true,
  region: Region.EU_868,
  modemPreset: Preset.SHORT_FAST,
});
const radioLora = create(Protobuf.Config.Config_LoRaConfigSchema, {
  usePreset: true,
  region: Region.US,
  modemPreset: Preset.LONG_FAST,
  hopLimit: 3,
  txEnabled: true,
});

const replaceLink = create(Protobuf.AppOnly.ChannelSetSchema, {
  settings: [settings("Hikers", [2]), settings("Ops", [3])],
  loraConfig: linkLora,
});

/** The same channels as a shared Add link, read back. */
function addLink(): Protobuf.AppOnly.ChannelSet {
  const parsed = parseChannelLink(channelSetToUrl(replaceLink, { add: true }));
  if (Result.isError(parsed)) throw new Error(parsed.error);
  return parsed.value;
}

const primary = settings("");

describe("import mode", () => {
  it("defaults to replace for a link with LoRa settings", () => {
    expect(canReplace(replaceLink)).toBe(true);
    expect(defaultImportMode(replaceLink)).toBe("replace");
  });

  it("only adds an add link: it carries no LoRa settings", () => {
    const link = addLink();
    expect(link.loraConfig).toBeUndefined();
    expect(canReplace(link)).toBe(false);
    expect(defaultImportMode(link)).toBe("add");
  });

  it("treats a replace request for an add link as an add", () => {
    const current = [primary, settings("Old", [7])];
    const plan = planChannelImport(addLink(), current, "replace");
    expect(plan.assignments).toEqual([
      { from: 0, slot: 2, role: "secondary" },
      { from: 1, slot: 3, role: "secondary" },
    ]);
    expect(plan.disable).toEqual([]);
    expect(plan.applyLora).toBe(false);
  });
});

describe("planChannelImport with a selection", () => {
  it("replaces with only the selected channels, from the primary up", () => {
    const current = [primary, settings("A", [5]), settings("B", [6])];
    const plan = planChannelImport(replaceLink, current, "replace", [1]);
    expect(plan.assignments).toEqual([{ from: 1, slot: 0, role: "primary" }]);
    expect(plan.disable).toEqual([1, 2]);
    expect(plan.applyLora).toBe(true);
  });

  it("adds only the selected channels", () => {
    const plan = planChannelImport(replaceLink, [primary], "add", [1]);
    expect(plan.assignments).toEqual([{ from: 1, slot: 1, role: "secondary" }]);
  });

  it("plans nothing, and no LoRa change, when nothing is selected", () => {
    const plan = planChannelImport(replaceLink, [primary], "replace", []);
    expect(plan.assignments).toEqual([]);
    expect(plan.applyLora).toBe(false);
  });
});

describe("planChannelImport add details", () => {
  it("counts free slots and never uses a slot that holds a channel", () => {
    const current = [
      primary,
      settings("A", [5]),
      undefined,
      settings("B", [6]),
    ];
    const plan = planChannelImport(replaceLink, current, "add");
    expect(plan.freeSlots).toBe(5);
    expect(plan.assignments.map((a) => a.slot)).toEqual([2, 4]);
  });

  it("says which channels are already on the radio", () => {
    const plan = planChannelImport(
      replaceLink,
      [primary, settings("Ops", [3])],
      "add",
    );
    expect(plan.alreadyOnRadio).toEqual([1]);
    expect(plan.noSlot).toEqual([]);
    expect(plan.assignments).toEqual([{ from: 0, slot: 2, role: "secondary" }]);
  });

  it("flags a channel with the same name and a different key", () => {
    const plan = planChannelImport(
      replaceLink,
      [primary, settings("Hikers", [9])],
      "add",
    );
    expect(plan.nameConflicts).toEqual([0]);
    expect(plan.alreadyOnRadio).toEqual([]);
    expect(plan.assignments.map((a) => a.from)).toEqual([0, 1]);
  });

  it("says which channels don't fit on a full radio", () => {
    const full = Array.from({ length: 8 }, (_, i) =>
      settings(`c${i}`, [i + 10]),
    );
    const plan = planChannelImport(replaceLink, full, "add");
    expect(plan.freeSlots).toBe(0);
    expect(plan.assignments).toEqual([]);
    expect(plan.noSlot).toEqual([0, 1]);
    expect(plan.skipped).toBe(2);
  });

  it("fills the last free slot and leaves the rest out", () => {
    const current = Array.from({ length: 7 }, (_, i) =>
      settings(`c${i}`, [i + 10]),
    );
    const plan = planChannelImport(replaceLink, current, "add");
    expect(plan.assignments).toEqual([{ from: 0, slot: 7, role: "secondary" }]);
    expect(plan.noSlot).toEqual([1]);
  });

  it("gives an unnamed, unencrypted channel a slot of its own", () => {
    const link = create(Protobuf.AppOnly.ChannelSetSchema, {
      settings: [settings("", []), settings("Ops", [3])],
    });
    const plan = planChannelImport(link, [primary], "add");
    expect(plan.assignments.map((a) => a.slot)).toEqual([1, 2]);
  });

  it("keeps a slot that holds an unnamed, unencrypted channel", () => {
    // Slot 1 holds a channel (an earlier import, say); slot 2 is disabled.
    const plan = planChannelImport(
      replaceLink,
      [primary, settings("", []), undefined],
      "add",
    );
    expect(plan.freeSlots).toBe(6);
    expect(plan.assignments.map((a) => a.slot)).toEqual([2, 3]);
  });
});

describe("import edits and LoRa", () => {
  const current = [primary, settings("Old", [7])];

  it("adding a replace link writes channels only, never LoRa", () => {
    const plan = planChannelImport(replaceLink, current, "add");
    const edits = buildChannelEdits(replaceLink, plan, radioLora);
    expect(Result.isOk(edits) && edits.value.lora).toBeUndefined();
    expect(
      Result.isOk(edits) &&
        edits.value.channels.map((c) => [c.index, c.role, c.settings?.name]),
    ).toEqual([
      [2, Role.SECONDARY, "Hikers"],
      [3, Role.SECONDARY, "Ops"],
    ]);
  });

  it("adding an add link writes no LoRa, even without the radio's LoRa", () => {
    const link = addLink();
    const plan = planChannelImport(link, current, "add");
    const edits = buildChannelEdits(link, plan, undefined);
    expect(Result.isOk(edits) && edits.value.lora).toBeUndefined();
  });

  it("replacing applies the link's LoRa over the radio's", () => {
    const plan = planChannelImport(replaceLink, current, "replace");
    const edits = buildChannelEdits(replaceLink, plan, radioLora);
    expect(Result.isOk(edits) && edits.value.lora).toMatchObject({
      region: Region.EU_868,
      modemPreset: Preset.SHORT_FAST,
      hopLimit: 3,
      txEnabled: true,
    });
  });

  it("won't replace before the radio's LoRa settings are known", () => {
    const plan = planChannelImport(replaceLink, current, "replace");
    expect(
      Result.isError(buildChannelEdits(replaceLink, plan, undefined)),
    ).toBe(true);
  });
});

describe("effective channel identity", () => {
  const DEFAULT_KEY = [
    0xd4, 0xf1, 0xbb, 0x3a, 0x20, 0x29, 0x07, 0x59, 0xf0, 0xbc, 0xff, 0xab,
    0xcf, 0x4e, 0x69, 0x01,
  ];

  it("expands a 1-byte key the way Android's Channel.psk does", () => {
    expect(effectiveChannelPsk(settings("", [0]))).toEqual(new Uint8Array());
    expect(effectiveChannelPsk(settings("", [1]))).toEqual(
      new Uint8Array(DEFAULT_KEY),
    );
    expect(effectiveChannelPsk(settings("", [3]))?.[15]).toBe(0x03);
    expect(effectiveChannelPsk(settings("", [5, 6]))).toEqual(
      new Uint8Array([5, 6]),
    );
  });

  it("knows the radio's unnamed default channel by its preset name", () => {
    const link = create(Protobuf.AppOnly.ChannelSetSchema, {
      settings: [settings("LongFast", DEFAULT_KEY)],
    });
    const plan = planChannelImport(link, [settings("", [1])], "add");
    expect(plan.alreadyOnRadio).toEqual([0]);
    expect(plan.assignments).toEqual([]);
  });

  it("names an unnamed channel by the radio's own preset", () => {
    const link = create(Protobuf.AppOnly.ChannelSetSchema, {
      settings: [settings("ShortFast", [1])],
    });
    const shortFast = create(Protobuf.Config.Config_LoRaConfigSchema, {
      usePreset: true,
      modemPreset: Preset.SHORT_FAST,
    });
    expect(
      planChannelImport(link, [settings("", [1])], "add", undefined, shortFast)
        .alreadyOnRadio,
    ).toEqual([0]);
    // Under LongFast the radio's channel is "LongFast": a different channel.
    expect(
      planChannelImport(link, [settings("", [1])], "add").alreadyOnRadio,
    ).toEqual([]);
  });

  it("flags two link channels with one name, and leaves out exact repeats", () => {
    const link = create(Protobuf.AppOnly.ChannelSetSchema, {
      settings: [
        settings("Hikers", [2]),
        settings("Hikers", [4]),
        settings("Hikers", [2]),
      ],
    });
    const plan = planChannelImport(link, [primary], "add");
    expect(plan.assignments.map((a) => a.from)).toEqual([0, 1]);
    expect(plan.nameConflicts).toEqual([1]);
    expect(plan.duplicates).toEqual([2]);
    expect(plan.alreadyOnRadio).toEqual([]);
  });
});
