import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import {
  buildDeviceProfile,
  defaultSelection,
  type ImportPlan,
  profileContents,
  selectProfileFields,
} from "@core/utils/profileExport.ts";
import { Result } from "better-result";
import { describe, expect, it } from "vitest";
import {
  planRestore,
  regionUnsetAfter,
  restoreNotes,
  restoreNotice,
  restoreRestarts,
  restoreRows,
} from "./restore.ts";

const Region = Protobuf.Config.Config_LoRaConfig_RegionCode;
const Role = Protobuf.Channel.Channel_Role;

const lora = (region: Protobuf.Config.Config_LoRaConfig_RegionCode) =>
  create(Protobuf.Config.Config_LoRaConfigSchema, { region, hopLimit: 3 });

const owner = create(Protobuf.Mesh.UserSchema, {
  id: "!00000001",
  longName: "Old",
  shortName: "OLD",
});
const security = create(Protobuf.Config.Config_SecurityConfigSchema, {
  privateKey: new Uint8Array(32).fill(1),
  publicKey: new Uint8Array(32).fill(2),
});
const target = { owner, security, activeChannelIndexes: [0] };

/** A backup as the export writes it: names, radio, modules, channels. */
const backup = (region = Region.EU_868) => {
  const profile = buildDeviceProfile({
    owner: create(Protobuf.Mesh.UserSchema, {
      longName: "Roof Node",
      shortName: "ROOF",
      isLicensed: false,
    }),
    radio: {
      lora: lora(region),
      security: create(Protobuf.Config.Config_SecurityConfigSchema, {
        privateKey: new Uint8Array(32).fill(7),
        publicKey: new Uint8Array(32).fill(9),
      }),
    },
    modules: {
      mqtt: create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
        enabled: true,
      }),
    },
    channels: [
      create(Protobuf.Channel.ChannelSchema, {
        index: 0,
        role: Role.PRIMARY,
        settings: create(Protobuf.Channel.ChannelSettingsSchema, {
          name: "Main",
          psk: new Uint8Array([1]),
        }),
      }),
    ],
  });
  return selectProfileFields(profile, defaultSelection(profile));
};

const emptyPlan = (): ImportPlan => ({
  radio: {},
  modules: {},
  channels: [],
  skipped: [],
});

describe("restoreRows", () => {
  it("lists only what the file holds and a restore applies", () => {
    const profile = backup();
    const rows = restoreRows(
      profileContents(profile),
      defaultSelection(profile),
    );
    expect(rows.map((row) => row.field)).toEqual([
      "longName",
      "shortName",
      "channelUrl",
      "config",
      "moduleConfig",
      "isUnmessagable",
    ]);
    expect(rows.every((row) => row.checked)).toBe(true);
  });
});

describe("restoreNotes", () => {
  it("names the skipped parts once and the keys the radio keeps", () => {
    const profile = backup();
    const selection = defaultSelection(profile);
    const plan = planRestore(profile, selection, target);
    if (!Result.isOk(plan)) throw plan.error;
    expect(restoreNotes(profile, selection, plan.value)).toEqual([
      "isLicensed",
      "keysKept",
    ]);
  });

  it("doesn't claim the keys are kept without the configuration", () => {
    const profile = backup();
    const selection = { ...defaultSelection(profile), config: false };
    const plan = planRestore(profile, selection, target);
    if (!Result.isOk(plan)) throw plan.error;
    expect(restoreNotes(profile, selection, plan.value)).not.toContain(
      "keysKept",
    );
  });
});

describe("restoreRestarts", () => {
  it("restarts for radio or module settings only", () => {
    expect(restoreRestarts(emptyPlan())).toBe(false);
    expect(restoreRestarts({ ...emptyPlan(), owner, channels: [] })).toBe(
      false,
    );
    expect(
      restoreRestarts({ ...emptyPlan(), radio: { lora: lora(Region.US) } }),
    ).toBe(true);
    expect(
      restoreRestarts({
        ...emptyPlan(),
        modules: {
          mqtt: create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema),
        },
      }),
    ).toBe(true);
  });
});

describe("regionUnsetAfter", () => {
  it("takes the file's region over the radio's", () => {
    const plan = { ...emptyPlan(), radio: { lora: lora(Region.EU_868) } };
    expect(regionUnsetAfter(plan, lora(Region.UNSET))).toBe(false);
  });

  it("keeps the radio's region when the file has none", () => {
    expect(regionUnsetAfter(emptyPlan(), lora(Region.US))).toBe(false);
    expect(regionUnsetAfter(emptyPlan(), lora(Region.UNSET))).toBe(true);
    expect(regionUnsetAfter(emptyPlan(), undefined)).toBe(true);
  });

  it("flags a file that sets the region to unset", () => {
    const profile = backup(Region.UNSET);
    const plan = planRestore(profile, defaultSelection(profile), target);
    if (!Result.isOk(plan)) throw plan.error;
    expect(regionUnsetAfter(plan.value, lora(Region.US))).toBe(true);
  });
});

describe("restoreNotice", () => {
  it("says what happened and what's next", () => {
    expect(restoreNotice("saved", false)).toBe("restore.saved");
    expect(restoreNotice("savedRestarting", false)).toBe(
      "restore.savedRestarting",
    );
    expect(restoreNotice("savedRestarting", true)).toBe(
      "restore.savedNoRegion",
    );
  });
});
