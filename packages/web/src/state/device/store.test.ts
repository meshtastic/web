import { create, toBinary } from "@bufbuild/protobuf";
import { Protobuf, type Types } from "@meshtastic/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const idbMem = new Map<string, string>();
vi.mock("idb-keyval", () => ({
  get: vi.fn((key: string) => Promise.resolve(idbMem.get(key))),
  set: vi.fn((key: string, val: string) => {
    idbMem.set(key, val);
    return Promise.resolve();
  }),
  del: vi.fn((k: string) => {
    idbMem.delete(k);
    return Promise.resolve();
  }),
}));

// Mock localStorage for logger
const localStorageMock = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => localStorageMock.get(key) ?? null,
  setItem: (key: string, value: string) => localStorageMock.set(key, value),
  removeItem: (key: string) => localStorageMock.delete(key),
  clear: () => localStorageMock.clear(),
});

// Helper to load a fresh copy of the store with persist flag on/off
async function freshStore(_persist = false) {
  vi.resetModules();

  // suppress console output from the store during tests (for github actions)
  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});

  const storeMod = await import("./index.ts");
  return { ...storeMod };
}

function makeHardware(myNodeNum: number) {
  return create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum });
}
function makeRoute(from: number, time = Date.now() / 1000) {
  return {
    from,
    rxTime: time,
    portnum: Protobuf.Portnums.PortNum.ROUTING_APP,
    data: create(Protobuf.Mesh.RouteDiscoverySchema, {}),
  } as unknown as Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>;
}
function makeChannel(index: number) {
  return create(Protobuf.Channel.ChannelSchema, { index });
}
function makeWaypoint(id: number, expire?: number) {
  return create(Protobuf.Mesh.WaypointSchema, { id, expire });
}

function makeAdminMessage(fields: Record<string, unknown>) {
  return create(Protobuf.Admin.AdminMessageSchema, fields);
}

describe("DeviceStore – single device lifecycle", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("initializeDevice returns device instance", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();

    expect(state.device).toBeNull();

    const device = state.initializeDevice();
    expect(device).toBeDefined();
    expect(state.device).toBeNull(); // Not updated yet - need to get fresh state
    expect(useDeviceStore.getState().device).toBe(device);
  });

  it("initializeDevice returns same instance on repeated calls", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();

    const a = state.initializeDevice();
    const b = useDeviceStore.getState().initializeDevice();
    expect(a).toBe(b);
  });

  it("clearDevice removes the device", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();

    state.initializeDevice();
    expect(useDeviceStore.getState().device).toBeDefined();

    useDeviceStore.getState().clearDevice();
    expect(useDeviceStore.getState().device).toBeNull();
  });

  it("legacy addDevice/getDevice/getDevices work with single device", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();

    // Legacy API should still work
    const device = state.addDevice(1);
    expect(device).toBeDefined();
    expect(state.getDevice(1)).toBe(device);
    expect(state.getDevices().length).toBe(1);

    // Second addDevice returns same device (single device model)
    const device2 = useDeviceStore.getState().addDevice(2);
    expect(device2).toBe(device);
    expect(useDeviceStore.getState().getDevices().length).toBe(1);
  });

  it("legacy removeDevice clears the device", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();

    state.addDevice(10);
    expect(state.getDevices().length).toBe(1);

    useDeviceStore.getState().removeDevice(10);
    expect(useDeviceStore.getState().device).toBeNull();
    expect(useDeviceStore.getState().getDevices().length).toBe(0);
  });
});

describe("DeviceStore – change registry API", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("setChange/hasChange/getChange for config and getEffectiveConfig merges base + working", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    // config deviceConfig.role = CLIENT
    device.setConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "device",
          value: create(Protobuf.Config.Config_DeviceConfigSchema, {
            role: Protobuf.Config.Config_DeviceConfig_Role.CLIENT,
          }),
        },
      }),
    );

    // working deviceConfig.role = ROUTER
    const routerConfig = create(Protobuf.Config.Config_DeviceConfigSchema, {
      role: Protobuf.Config.Config_DeviceConfig_Role.ROUTER,
    });
    device.setChange({ type: "config", variant: "device" }, routerConfig);

    // expect change is tracked
    expect(device.hasConfigChange("device")).toBe(true);

    // expect effective deviceConfig.role = ROUTER
    const effective = device.getEffectiveConfig("device");
    expect(effective?.role).toBe(
      Protobuf.Config.Config_DeviceConfig_Role.ROUTER,
    );

    // remove change, effective should equal base
    device.clearAllChanges();
    expect(device.hasConfigChange("device")).toBe(false);
    expect(device.getEffectiveConfig("device")?.role).toBe(
      Protobuf.Config.Config_DeviceConfig_Role.CLIENT,
    );
  });

  it("setChange/hasChange for moduleConfig and getEffectiveModuleConfig", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    // base moduleConfig.mqtt with base address
    device.setModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "mqtt",
          value: create(Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema, {
            address: "mqtt://base",
          }),
        },
      }),
    );

    // working mqtt config
    const workingMqtt = create(
      Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema,
      { address: "mqtt://working" },
    );
    device.setChange({ type: "moduleConfig", variant: "mqtt" }, workingMqtt);

    expect(device.hasModuleConfigChange("mqtt")).toBe(true);

    // effective should return working value
    expect(device.getEffectiveModuleConfig("mqtt")?.address).toBe(
      "mqtt://working",
    );

    // Clear all changes
    device.clearAllChanges();
    expect(device.hasModuleConfigChange("mqtt")).toBe(false);
    expect(device.getEffectiveModuleConfig("mqtt")?.address).toBe(
      "mqtt://base",
    );
  });

  it("channel change tracking add/update/remove", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    const channel0 = makeChannel(0);
    const channel1 = create(Protobuf.Channel.ChannelSchema, {
      index: 1,
      settings: { name: "one" },
    });

    device.setChange({ type: "channel", index: 0 }, channel0);
    device.setChange({ type: "channel", index: 1 }, channel1);

    expect(device.hasChannelChange(0)).toBe(true);
    expect(device.hasChannelChange(1)).toBe(true);

    // update channel 1
    const channel1Updated = create(Protobuf.Channel.ChannelSchema, {
      index: 1,
      settings: { name: "uno" },
    });
    device.setChange({ type: "channel", index: 1 }, channel1Updated);
    expect(device.getChannelChangeCount()).toBe(2);

    // remove all
    device.clearAllChanges();
    expect(device.hasChannelChange(0)).toBe(false);
    expect(device.hasChannelChange(1)).toBe(false);
  });
});

describe("DeviceStore – metadata, dialogs", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("addMetadata stores by node id", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    const metadata = create(Protobuf.Mesh.DeviceMetadataSchema, {
      firmwareVersion: "1.2.3",
    });
    device.addMetadata(123, metadata);

    expect(useDeviceStore.getState().device?.metadata.get(123)).toEqual(
      metadata,
    );
  });

  it("dialogs set/get work", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    device.setDialogOpen("reboot", true);
    expect(device.getDialogOpen("reboot")).toBe(true);
    device.setDialogOpen("reboot", false);
    expect(device.getDialogOpen("reboot")).toBe(false);
  });
});

describe("DeviceStore – traceroutes & waypoints", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("addTraceRoute appends routes", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    device.addTraceRoute(makeRoute(7, 1));
    device.addTraceRoute(makeRoute(7, 2));
    device.addTraceRoute(makeRoute(8, 1));

    const deviceState = useDeviceStore.getState().device;
    expect(deviceState?.traceroutes.get(7)?.length).toBe(2);
    expect(deviceState?.traceroutes.get(8)?.length).toBe(1);
  });

  it("addWaypoint upserts by id and handles expiration", async () => {
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();

    const device = state.initializeDevice();

    // Add non-expiring waypoint
    device.addWaypoint(makeWaypoint(1, 0), 0, 0, new Date());
    // Add future-expiring waypoint
    device.addWaypoint(
      makeWaypoint(2, Date.parse("2026-01-01T00:00:00Z")),
      0,
      0,
      new Date(),
    );

    const wps = useDeviceStore.getState().device?.waypoints ?? [];
    expect(wps.length).toBe(2);

    // Update waypoint 1
    device.addWaypoint(
      makeWaypoint(1, Date.parse("2027-01-01T00:00:00Z")),
      0,
      0,
      new Date(),
    );

    const wpsAfter = useDeviceStore.getState().device?.waypoints ?? [];
    expect(wpsAfter.length).toBe(2);
    expect(wpsAfter.find((w) => w.id === 1)?.expire).toBe(
      Date.parse("2027-01-01T00:00:00Z"),
    );

    // getWaypoint works
    expect(device.getWaypoint(1)).toBeTruthy();
    expect(device.getWaypoint(999)).toBeUndefined();

    vi.useRealTimers();
  });

  it("removeWaypoint removes from store", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    device.addWaypoint(makeWaypoint(1), 0, 0, new Date());
    device.addWaypoint(makeWaypoint(2), 0, 0, new Date());

    expect(useDeviceStore.getState().device?.waypoints.length).toBe(2);

    // Remove without mesh broadcast
    await device.removeWaypoint(1, false);

    expect(useDeviceStore.getState().device?.waypoints.length).toBe(1);
    expect(device.getWaypoint(1)).toBeUndefined();
    expect(device.getWaypoint(2)).toBeTruthy();
  });
});

describe("DeviceStore – connection & sendAdminMessage", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("sendAdminMessage calls through to connection.sendPacket with correct args", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    const sendPacket = vi.fn();
    useDeviceStore.getState().setConnection({ sendPacket } as never);

    const message = makeAdminMessage({ logVerbosity: 1 });
    device.sendAdminMessage(message);

    expect(sendPacket).toHaveBeenCalledTimes(1);
    const [bytes, port, dest] = sendPacket.mock.calls[0]!;
    expect(port).toBe(Protobuf.Portnums.PortNum.ADMIN_APP);
    expect(dest).toBe("self");

    // sanity: encoded bytes match toBinary on the same schema
    const expected = toBinary(Protobuf.Admin.AdminMessageSchema, message);
    expect(bytes).toBeInstanceOf(Uint8Array);

    // compare content length as minimal assertion (exact byte-for-byte is fine too)
    expect((bytes as Uint8Array).length).toBe(expected.length);
  });
});

describe("DeviceStore – config progress tracking", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("initializes configProgress with empty set and correct total", async () => {
    const { useDeviceStore, TOTAL_CONFIG_COUNT } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    expect(device.configProgress.receivedConfigs.size).toBe(0);
    expect(device.configProgress.total).toBe(TOTAL_CONFIG_COUNT);
    expect(TOTAL_CONFIG_COUNT).toBe(21); // 8 device configs + 13 module configs
  });

  it("tracks config progress when setConfig is called", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    // Set device config
    device.setConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "device",
          value: create(Protobuf.Config.Config_DeviceConfigSchema, {}),
        },
      }),
    );

    const updatedDevice = useDeviceStore.getState().device!;
    expect(
      updatedDevice.configProgress.receivedConfigs.has("config:device"),
    ).toBe(true);
    expect(updatedDevice.configProgress.receivedConfigs.size).toBe(1);

    // Set lora config
    device.setConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "lora",
          value: create(Protobuf.Config.Config_LoRaConfigSchema, {}),
        },
      }),
    );

    const afterLora = useDeviceStore.getState().device!;
    expect(afterLora.configProgress.receivedConfigs.has("config:lora")).toBe(
      true,
    );
    expect(afterLora.configProgress.receivedConfigs.size).toBe(2);
  });

  it("tracks module config progress when setModuleConfig is called", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    // Set mqtt module config
    device.setModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "mqtt",
          value: create(
            Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema,
            {},
          ),
        },
      }),
    );

    const updatedDevice = useDeviceStore.getState().device!;
    expect(
      updatedDevice.configProgress.receivedConfigs.has("moduleConfig:mqtt"),
    ).toBe(true);
    expect(updatedDevice.configProgress.receivedConfigs.size).toBe(1);

    // Set telemetry module config
    device.setModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "telemetry",
          value: create(
            Protobuf.ModuleConfig.ModuleConfig_TelemetryConfigSchema,
            {},
          ),
        },
      }),
    );

    const afterTelemetry = useDeviceStore.getState().device!;
    expect(
      afterTelemetry.configProgress.receivedConfigs.has(
        "moduleConfig:telemetry",
      ),
    ).toBe(true);
    expect(afterTelemetry.configProgress.receivedConfigs.size).toBe(2);
  });

  it("resetConfigProgress clears received configs", async () => {
    const { useDeviceStore, TOTAL_CONFIG_COUNT } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    // Add some configs
    device.setConfig(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: "device",
          value: create(Protobuf.Config.Config_DeviceConfigSchema, {}),
        },
      }),
    );
    device.setModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: "mqtt",
          value: create(
            Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema,
            {},
          ),
        },
      }),
    );

    expect(
      useDeviceStore.getState().device!.configProgress.receivedConfigs.size,
    ).toBe(2);

    // Reset progress
    device.resetConfigProgress();

    const afterReset = useDeviceStore.getState().device!;
    expect(afterReset.configProgress.receivedConfigs.size).toBe(0);
    expect(afterReset.configProgress.total).toBe(TOTAL_CONFIG_COUNT);
  });

  it("getConfigProgressPercent calculates correct percentage", async () => {
    const { useDeviceStore, getConfigProgressPercent, TOTAL_CONFIG_COUNT } =
      await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    // Initially 0%
    expect(getConfigProgressPercent(device.configProgress)).toBe(0);

    // Add 8 device configs
    const deviceConfigs = [
      "device",
      "position",
      "power",
      "network",
      "display",
      "lora",
      "bluetooth",
      "security",
    ] as const;
    for (const variant of deviceConfigs) {
      device.setConfig(
        create(Protobuf.Config.ConfigSchema, {
          payloadVariant: {
            case: variant,
            value: {},
          },
          // biome-ignore lint/suspicious/noExplicitAny: test helper
        } as any),
      );
    }

    // 8 configs out of 21 = ~38%
    const afterDeviceConfigs = useDeviceStore.getState().device!;
    expect(getConfigProgressPercent(afterDeviceConfigs.configProgress)).toBe(
      Math.round((8 / TOTAL_CONFIG_COUNT) * 100),
    );

    // Add 2 module configs
    device.setModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: { case: "mqtt", value: {} },
        // biome-ignore lint/suspicious/noExplicitAny: test helper
      } as any),
    );
    device.setModuleConfig(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: { case: "serial", value: {} },
        // biome-ignore lint/suspicious/noExplicitAny: test helper
      } as any),
    );

    // 10 configs out of 21 = ~48%
    const afterModuleConfigs = useDeviceStore.getState().device!;
    expect(getConfigProgressPercent(afterModuleConfigs.configProgress)).toBe(
      Math.round((10 / TOTAL_CONFIG_COUNT) * 100),
    );
  });

  it("does not duplicate config entries on repeated setConfig calls", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    // Set same config multiple times
    for (let i = 0; i < 5; i++) {
      device.setConfig(
        create(Protobuf.Config.ConfigSchema, {
          payloadVariant: {
            case: "device",
            value: create(Protobuf.Config.Config_DeviceConfigSchema, {}),
          },
        }),
      );
    }

    const updatedDevice = useDeviceStore.getState().device!;
    expect(updatedDevice.configProgress.receivedConfigs.size).toBe(1);
    expect(
      updatedDevice.configProgress.receivedConfigs.has("config:device"),
    ).toBe(true);
  });
});

describe("DeviceStore – hardware & neighbor info", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("setHardware updates hardware info", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    const hardware = makeHardware(12345);
    device.setHardware(hardware);

    expect(useDeviceStore.getState().device?.hardware.myNodeNum).toBe(12345);
  });

  it("getMyNodeNum returns the myNodeNum from hardware", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    // Protobuf default for unset number is 0
    expect(device.getMyNodeNum()).toBe(0);

    device.setHardware(makeHardware(99999));
    expect(device.getMyNodeNum()).toBe(99999);
  });

  it("addNeighborInfo/getNeighborInfo work", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    const neighborInfo = create(Protobuf.Mesh.NeighborInfoSchema, {
      nodeId: 123,
      lastSentById: 456,
    });

    device.addNeighborInfo(123, neighborInfo);

    expect(device.getNeighborInfo(123)).toEqual(neighborInfo);
    expect(device.getNeighborInfo(999)).toBeUndefined();
  });
});

describe("DeviceStore – client notifications", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("addClientNotification/getClientNotification/removeClientNotification work", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    const notification = create(Protobuf.Mesh.ClientNotificationSchema, {
      time: 123456,
    });

    device.addClientNotification(notification);
    expect(device.getClientNotification(0)).toEqual(notification);

    device.removeClientNotification(0);
    expect(device.getClientNotification(0)).toBeUndefined();
  });
});

describe("DeviceStore – config caching", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("setCachedConfig sets config and isCachedConfig flag", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    const config = create(Protobuf.LocalOnly.LocalConfigSchema, {
      device: create(Protobuf.Config.Config_DeviceConfigSchema, {
        role: Protobuf.Config.Config_DeviceConfig_Role.ROUTER,
      }),
    });
    const moduleConfig = create(Protobuf.LocalOnly.LocalModuleConfigSchema, {});

    device.setCachedConfig(config, moduleConfig);

    const updatedDevice = useDeviceStore.getState().device!;
    expect(updatedDevice.isCachedConfig).toBe(true);
    expect(updatedDevice.config.device?.role).toBe(
      Protobuf.Config.Config_DeviceConfig_Role.ROUTER,
    );
  });

  it("config conflicts can be set, checked, and cleared", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    expect(device.hasAnyConflicts()).toBe(false);

    device.setConfigConflict("config", "device", {
      variant: "device",
      localValue: { role: 1 },
      remoteValue: { role: 2 },
    });

    expect(device.hasAnyConflicts()).toBe(true);
    expect(device.getConfigConflict("config", "device")).toBeDefined();

    device.clearConfigConflicts();
    expect(device.hasAnyConflicts()).toBe(false);
  });
});

describe("DeviceStore – remote administration", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("setRemoteAdminTarget updates target and authorization", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    // Initially local (null target)
    expect(device.getAdminDestination()).toBe("self");

    // Set remote target without authorization
    device.setRemoteAdminTarget(12345);
    expect(device.getAdminDestination()).toBe(12345);

    const updatedDevice = useDeviceStore.getState().device!;
    expect(updatedDevice.remoteAdminTargetNode).toBe(12345);
    expect(updatedDevice.remoteAdminAuthorized).toBe(false);

    // Clear remote admin (back to local)
    device.setRemoteAdminTarget(null);
    expect(device.getAdminDestination()).toBe("self");
    expect(useDeviceStore.getState().device!.remoteAdminAuthorized).toBe(true);
  });

  it("tracks recently connected nodes", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    device.setRemoteAdminTarget(100);
    device.setRemoteAdminTarget(200);
    device.setRemoteAdminTarget(300);

    const updatedDevice = useDeviceStore.getState().device!;
    expect(updatedDevice.recentlyConnectedNodes).toContain(100);
    expect(updatedDevice.recentlyConnectedNodes).toContain(200);
    expect(updatedDevice.recentlyConnectedNodes).toContain(300);
  });
});

describe("DeviceStore – queued admin messages", () => {
  beforeEach(() => {
    idbMem.clear();
    vi.clearAllMocks();
  });

  it("queueAdminMessage and getAllQueuedAdminMessages work", async () => {
    const { useDeviceStore } = await freshStore(false);
    const state = useDeviceStore.getState();
    const device = state.initializeDevice();

    const message1 = makeAdminMessage({ logVerbosity: 1 });
    const message2 = makeAdminMessage({ logVerbosity: 2 });

    device.queueAdminMessage(message1);
    device.queueAdminMessage(message2);

    expect(device.getAdminMessageChangeCount()).toBe(2);
    expect(device.getAllQueuedAdminMessages().length).toBe(2);

    device.clearAllChanges();
    expect(device.getAdminMessageChangeCount()).toBe(0);
  });
});
