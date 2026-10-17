import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { Result } from "better-result";
import { describe, expect, it } from "vitest";
import {
  buildDeviceProfile,
  decodeDeviceProfile,
  defaultSelection,
  deviceProfileFileName,
  encodeDeviceProfile,
  planProfileImport,
  type ProfileSource,
  profileContents,
  sanitizeExportNameSegment,
  selectProfileFields,
} from "./profileExport.ts";

const PRIVATE_KEY = new Uint8Array(32).fill(7);
const PUBLIC_KEY = new Uint8Array(32).fill(9);

const makeSource = (overrides: Partial<ProfileSource> = {}): ProfileSource => ({
  owner: create(Protobuf.Mesh.UserSchema, {
    id: "!abcd1234",
    longName: "Roof Node",
    shortName: "ROOF",
    isLicensed: false,
  }),
  radio: {
    device: create(Protobuf.Config.Config_DeviceConfigSchema, {
      role: Protobuf.Config.Config_DeviceConfig_Role.ROUTER,
    }),
    position: create(Protobuf.Config.Config_PositionConfigSchema, {
      fixedPosition: true,
    }),
    lora: create(Protobuf.Config.Config_LoRaConfigSchema, {
      region: Protobuf.Config.Config_LoRaConfig_RegionCode.EU_868,
    }),
    security: create(Protobuf.Config.Config_SecurityConfigSchema, {
      privateKey: PRIVATE_KEY,
      publicKey: PUBLIC_KEY,
      serialEnabled: true,
    }),
  },
  modules: {
    mqtt: create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
      enabled: true,
      address: "mqtt.example.org",
    }),
  },
  channels: [
    create(Protobuf.Channel.ChannelSchema, {
      index: 0,
      role: Protobuf.Channel.Channel_Role.PRIMARY,
      settings: create(Protobuf.Channel.ChannelSettingsSchema, {
        name: "Main",
        psk: new Uint8Array([1]),
      }),
    }),
    create(Protobuf.Channel.ChannelSchema, {
      index: 1,
      role: Protobuf.Channel.Channel_Role.DISABLED,
    }),
  ],
  ownPosition: create(Protobuf.Mesh.PositionSchema, {
    latitudeI: 515000000,
    longitudeI: -1000000,
    altitude: 42,
  }),
  ...overrides,
});

describe("profile export", () => {
  it("leaves the private and public key out by default", () => {
    const profile = buildDeviceProfile(makeSource());
    const selection = defaultSelection(profile);
    expect(selection.privateKey).toBe(false);

    const exported = selectProfileFields(profile, selection);
    expect(exported.config?.security?.privateKey).toHaveLength(0);
    expect(exported.config?.security?.publicKey).toHaveLength(0);
    // The rest of the security section is kept.
    expect(exported.config?.security?.serialEnabled).toBe(true);
  });

  it("keeps the private key only when chosen", () => {
    const profile = buildDeviceProfile(makeSource());
    const exported = selectProfileFields(profile, {
      ...defaultSelection(profile),
      privateKey: true,
    });
    expect(exported.config?.security?.privateKey).toEqual(PRIVATE_KEY);
  });

  it("round-trips through the binary format", () => {
    const profile = buildDeviceProfile(makeSource());
    const exported = selectProfileFields(profile, defaultSelection(profile));
    const decoded = decodeDeviceProfile(encodeDeviceProfile(exported));
    expect(Result.isOk(decoded)).toBe(true);
    if (!Result.isOk(decoded)) return;
    const back = decoded.value;
    expect(back.longName).toBe("Roof Node");
    expect(back.shortName).toBe("ROOF");
    expect(back.config?.device?.role).toBe(
      Protobuf.Config.Config_DeviceConfig_Role.ROUTER,
    );
    expect(back.moduleConfig?.mqtt?.address).toBe("mqtt.example.org");
    expect(back.fixedPosition?.latitudeI).toBe(515000000);
    expect(back.channelUrl).toMatch(/^https:\/\/meshtastic\.org\/e\/#/);
    expect(back.config?.security?.privateKey).toHaveLength(0);
    expect(profileContents(back).privateKey).toBe(false);
  });

  it("drops parts that are unselected", () => {
    const profile = buildDeviceProfile(makeSource());
    const exported = selectProfileFields(profile, {
      ...defaultSelection(profile),
      longName: false,
      moduleConfig: false,
      channelUrl: false,
    });
    expect(exported.longName).toBeUndefined();
    expect(exported.moduleConfig).toBeUndefined();
    expect(exported.channelUrl).toBeUndefined();
    expect(exported.shortName).toBe("ROOF");
  });

  it("exports no fixed position when it is off", () => {
    const source = makeSource();
    const profile = buildDeviceProfile({
      ...source,
      radio: {
        ...source.radio,
        position: create(Protobuf.Config.Config_PositionConfigSchema, {}),
      },
    });
    expect(profile.fixedPosition).toBeUndefined();
  });

  it("rejects bytes that aren't a profile", () => {
    expect(
      Result.isError(decodeDeviceProfile(new Uint8Array([0xff, 0xff, 0xff]))),
    ).toBe(true);
    expect(Result.isError(decodeDeviceProfile(new Uint8Array()))).toBe(true);
  });
});

describe("export file name", () => {
  const date = new Date(2026, 9, 7);

  it("follows Android's pattern", () => {
    expect(deviceProfileFileName("Roof // Node", "ROOF", date)).toBe(
      "Meshtastic_Roof_Node_20261007_nodeConfig.cfg",
    );
  });

  it("falls back to the short name, then to node", () => {
    expect(deviceProfileFileName("📡📡", "AB", date)).toBe(
      "Meshtastic_AB_20261007_nodeConfig.cfg",
    );
    expect(deviceProfileFileName(undefined, "🙂", date)).toBe(
      "Meshtastic_node_20261007_nodeConfig.cfg",
    );
  });

  it("keeps letters of any script", () => {
    expect(sanitizeExportNameSegment("Küche")).toBe("Küche");
    expect(sanitizeExportNameSegment("東京")).toBe("東京");
    expect(sanitizeExportNameSegment("  a/b\\c  ")).toBe("a_b_c");
    expect(sanitizeExportNameSegment("x".repeat(60))).toHaveLength(48);
  });
});

describe("profile import", () => {
  const currentSecurity = create(Protobuf.Config.Config_SecurityConfigSchema, {
    privateKey: new Uint8Array(32).fill(1),
    publicKey: new Uint8Array(32).fill(2),
  });
  const owner = create(Protobuf.Mesh.UserSchema, {
    id: "!00000001",
    longName: "Old",
    shortName: "OLD",
    hwModel: Protobuf.Mesh.HardwareModel.RAK4631,
  });

  const exportedProfile = () => {
    const profile = buildDeviceProfile(makeSource());
    return selectProfileFields(profile, defaultSelection(profile));
  };

  it("keeps the node's own keys when the file has none", () => {
    const plan = planProfileImport(exportedProfile(), {
      owner,
      security: currentSecurity,
      activeChannelIndexes: [0],
    });
    expect(Result.isOk(plan)).toBe(true);
    if (!Result.isOk(plan)) return;
    expect(plan.value.radio.security?.privateKey).toEqual(
      currentSecurity.privateKey,
    );
    expect(plan.value.radio.security?.publicKey).toEqual(
      currentSecurity.publicKey,
    );
    expect(plan.value.radio.security?.serialEnabled).toBe(true);
  });

  it("skips security rather than send empty keys", () => {
    const plan = planProfileImport(exportedProfile(), {
      owner,
      activeChannelIndexes: [],
    });
    if (!Result.isOk(plan)) throw plan.error;
    expect(plan.value.radio.security).toBeUndefined();
    expect(plan.value.skipped).toContain("security");
  });

  it("merges names into the current owner", () => {
    const plan = planProfileImport(exportedProfile(), {
      owner,
      activeChannelIndexes: [],
    });
    if (!Result.isOk(plan)) throw plan.error;
    expect(plan.value.owner?.longName).toBe("Roof Node");
    expect(plan.value.owner?.id).toBe("!00000001");
    expect(plan.value.owner?.hwModel).toBe(Protobuf.Mesh.HardwareModel.RAK4631);
    expect(plan.value.skipped).toContain("isLicensed");
  });

  it("replaces the channel table and disables leftover channels", () => {
    const plan = planProfileImport(exportedProfile(), {
      owner,
      activeChannelIndexes: [0, 1, 3],
    });
    if (!Result.isOk(plan)) throw plan.error;
    const byIndex = new Map(plan.value.channels.map((ch) => [ch.index, ch]));
    expect(byIndex.get(0)?.role).toBe(Protobuf.Channel.Channel_Role.PRIMARY);
    expect(byIndex.get(0)?.settings?.name).toBe("Main");
    expect(byIndex.get(1)?.role).toBe(Protobuf.Channel.Channel_Role.DISABLED);
    expect(byIndex.get(3)?.role).toBe(Protobuf.Channel.Channel_Role.DISABLED);
    expect(byIndex.has(2)).toBe(false);
    expect(plan.value.radio.lora?.region).toBe(
      Protobuf.Config.Config_LoRaConfig_RegionCode.EU_868,
    );
  });

  it("stages modules and the fixed position, but not traffic management", () => {
    const profile = exportedProfile();
    if (!profile.moduleConfig) throw new Error("expected module config");
    profile.moduleConfig.trafficManagement = create(
      Protobuf.ModuleConfig.ModuleConfig_TrafficManagementConfigSchema,
      {},
    );
    const plan = planProfileImport(profile, {
      owner,
      activeChannelIndexes: [],
    });
    if (!Result.isOk(plan)) throw plan.error;
    expect(plan.value.modules.mqtt?.enabled).toBe(true);
    expect(plan.value.modules.trafficManagement).toBeUndefined();
    expect(plan.value.skipped).toContain("trafficManagement");
    expect(plan.value.fixedPosition?.altitude).toBe(42);
  });

  it("fails on a bad channel URL", () => {
    const profile = exportedProfile();
    profile.channelUrl = "https://example.com/not-a-channel";
    expect(
      Result.isError(
        planProfileImport(profile, { owner, activeChannelIndexes: [] }),
      ),
    ).toBe(true);
  });
});
