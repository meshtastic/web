import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { Result } from "better-result";
import { describe, expect, it } from "vitest";
import { planChannelImport } from "./channelImport.ts";
import { classifyPickerError } from "./picker.ts";
import {
  buildChannelEdits,
  buildProfileEdits,
  classifyCommit,
  COMMIT_DISCONNECTED_MESSAGE,
  replaceRegionChange,
} from "./saves.ts";

const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;
const Preset = Protobuf.Config.Config_LoRaConfig_ModemPreset;
const Role = Protobuf.Channel.Channel_Role;

const lora = create(Protobuf.Config.Config_LoRaConfigSchema, {
  region: Region.US,
  usePreset: true,
  txEnabled: true,
  hopLimit: 3,
  modemPreset: Preset.LONG_FAST,
});
const user = create(Protobuf.Mesh.UserSchema, {
  id: "!abcd",
  longName: "Old name",
  shortName: "OLD",
  hwModel: 9,
});

const value = <T, E>(r: Result<T, E>): T => {
  if (Result.isError(r)) throw new Error(`unexpected error ${String(r.error)}`);
  return r.value;
};

describe("buildProfileEdits", () => {
  const base = {
    user,
    longName: "Old name",
    shortName: "OLD",
    currentLora: lora,
    region: Region.US,
    defaultPreset: undefined,
  };

  it("stages nothing when nothing changed", () => {
    expect(value(buildProfileEdits(base))).toEqual({
      owner: undefined,
      restartExpected: false,
    });
  });

  it("trims names and keeps the other user fields", () => {
    const edits = value(
      buildProfileEdits({
        ...base,
        longName: "  Base camp ",
        shortName: " BC ",
      }),
    );
    expect(edits.owner?.longName).toBe("Base camp");
    expect(edits.owner?.shortName).toBe("BC");
    expect(edits.owner?.id).toBe("!abcd");
    expect(edits.owner?.hwModel).toBe(9);
    expect(edits.lora).toBeUndefined();
  });

  it("changes the region over the whole current LoRa section", () => {
    const edits = value(
      buildProfileEdits({
        ...base,
        region: Region.EU_868,
        defaultPreset: Preset.MEDIUM_FAST,
      }),
    );
    expect(edits.restartExpected).toBe(true);
    expect(edits.lora).toMatchObject({
      region: Region.EU_868,
      modemPreset: Preset.MEDIUM_FAST,
      txEnabled: true,
      usePreset: true,
      hopLimit: 3,
    });
  });

  it("refuses a region change before the LoRa section is known", () => {
    const result = buildProfileEdits({
      ...base,
      currentLora: undefined,
      region: Region.EU_868,
    });
    expect(Result.isError(result) && result.error).toBe("loraNotLoaded");
  });
});

describe("buildChannelEdits", () => {
  const link = create(Protobuf.AppOnly.ChannelSetSchema, {
    settings: [
      create(Protobuf.Channel.ChannelSettingsSchema, { name: "Hikers" }),
    ],
    loraConfig: create(Protobuf.Config.Config_LoRaConfigSchema, {
      region: Region.EU_868,
      modemPreset: Preset.SHORT_FAST,
    }),
  });
  const current = [
    create(Protobuf.Channel.ChannelSettingsSchema, {
      psk: new Uint8Array([1]),
    }),
    create(Protobuf.Channel.ChannelSettingsSchema, { name: "Old" }),
  ];

  it("adds as secondaries without touching LoRa", () => {
    const plan = planChannelImport(link, current, "add");
    const edits = value(buildChannelEdits(link, plan, lora));
    expect(
      edits.channels.map((c) => [c.index, c.role, c.settings?.name]),
    ).toEqual([[2, Role.SECONDARY, "Hikers"]]);
    expect(edits.lora).toBeUndefined();
    expect(edits.restartExpected).toBe(false);
  });

  it("replaces, clears the rest and merges the link's LoRa settings", () => {
    const plan = planChannelImport(link, current, "replace");
    const edits = value(buildChannelEdits(link, plan, lora));
    expect(edits.channels.map((c) => [c.index, c.role])).toEqual([
      [0, Role.PRIMARY],
      [1, Role.DISABLED],
    ]);
    expect(edits.lora).toMatchObject({
      region: Region.EU_868,
      modemPreset: Preset.SHORT_FAST,
      txEnabled: true,
      hopLimit: 3,
    });
    expect(edits.restartExpected).toBe(true);
    expect(Result.isError(buildChannelEdits(link, plan, undefined))).toBe(true);
  });

  it("names a region change a replace would make", () => {
    expect(replaceRegionChange(lora, link)).toEqual({
      from: "US",
      to: "EU_868",
    });
    expect(
      replaceRegionChange(
        create(Protobuf.Config.Config_LoRaConfigSchema, {
          region: Region.EU_868,
        }),
        link,
      ),
    ).toBeUndefined();
  });
});

describe("classifyCommit", () => {
  const ok = Result.ok<void, Error>(undefined);
  const failed = (message: string) =>
    Result.err<void, Error>(new Error(message));

  it("is saved, or restarting after a LoRa change", () => {
    expect(
      classifyCommit(ok, { restartExpected: false, statusAfter: "configured" }),
    ).toBe("saved");
    expect(
      classifyCommit(ok, { restartExpected: true, statusAfter: "configured" }),
    ).toBe("savedRestarting");
  });

  it("treats a restart-caused disconnect as saved", () => {
    expect(
      classifyCommit(failed(COMMIT_DISCONNECTED_MESSAGE), {
        restartExpected: true,
        statusAfter: "configured",
      }),
    ).toBe("savedRestarting");
    expect(
      classifyCommit(failed("timeout"), {
        restartExpected: true,
        statusAfter: "configuring",
      }),
    ).toBe("savedRestarting");
  });

  it("fails otherwise", () => {
    expect(
      classifyCommit(failed(COMMIT_DISCONNECTED_MESSAGE), {
        restartExpected: false,
        statusAfter: "disconnected",
      }),
    ).toBe("failed");
    expect(
      classifyCommit(failed("rejected"), {
        restartExpected: true,
        statusAfter: "configured",
      }),
    ).toBe("failed");
  });
});

describe("classifyPickerError", () => {
  const notFound = (message: string) =>
    Object.assign(new Error(message), { name: "NotFoundError" });

  it("counts only the user closing the chooser as a cancel", () => {
    expect(
      classifyPickerError(
        notFound("User cancelled the requestDevice() chooser."),
      ),
    ).toEqual({ kind: "cancelled" });
    expect(
      classifyPickerError(notFound("No port selected by the user.")),
    ).toEqual({ kind: "cancelled" });
    expect(
      classifyPickerError(notFound("Bluetooth adapter not available.")),
    ).toEqual({ kind: "failed", detail: "Bluetooth adapter not available." });
    expect(classifyPickerError("boom")).toEqual({
      kind: "failed",
      detail: "boom",
    });
  });
});
