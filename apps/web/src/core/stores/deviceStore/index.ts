import { create, toBinary } from "@bufbuild/protobuf";
import { evictOldestEntries } from "@core/stores/utils/evictOldestEntries.ts";
import { createStorage } from "@core/stores/utils/indexDB.ts";
import { type MeshDevice, Protobuf, Types } from "@meshtastic/sdk";
import { type Draft, produce } from "immer";
import { create as createStore, type StateCreator } from "zustand";
import {
  type PersistOptions,
  persist,
  subscribeWithSelector,
} from "zustand/middleware";
import type {
  Connection,
  ConnectionId,
  Dialogs,
  DialogVariant,
  ValidConfigType,
  ValidModuleConfigType,
  WaypointWithMetadata,
} from "./types.ts";

const IDB_KEY_NAME = "meshtastic-device-store";
const CURRENT_STORE_VERSION = 0;
const DEVICESTORE_RETENTION_NUM = 10;
const TRACEROUTE_TARGET_RETENTION_NUM = 100; // Number of traceroutes targets to keep
const TRACEROUTE_ROUTE_RETENTION_NUM = 100; // Number of traceroutes to keep per target
const WAYPOINT_RETENTION_NUM = 100;

type DeviceData = {
  // Persisted data
  id: number;
  myNodeNum: number | undefined;
  traceroutes: Map<
    number,
    Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>[]
  >;
  waypoints: WaypointWithMetadata[];
  neighborInfo: Map<number, Protobuf.Mesh.NeighborInfo>;
};
export type ConnectionPhase =
  | "disconnected"
  | "connecting"
  | "configuring"
  | "configured";

export interface Device extends DeviceData {
  // Ephemeral state (not persisted)
  status: Types.DeviceStatusEnum;
  connectionPhase: ConnectionPhase;
  connectionId: ConnectionId | null;
  channels: Map<Types.ChannelNumber, Protobuf.Channel.Channel>;
  config: Protobuf.LocalOnly.LocalConfig;
  moduleConfig: Protobuf.LocalOnly.LocalModuleConfig;
  hardware: Protobuf.Mesh.MyNodeInfo;
  metadata: Map<number, Protobuf.Mesh.DeviceMetadata>;
  connection?: MeshDevice;
  activeNode: number;
  pendingSettingsChanges: boolean;
  messageDraft: string;
  dialog: Dialogs;
  clientNotifications: Protobuf.Mesh.ClientNotification[];

  setStatus: (status: Types.DeviceStatusEnum) => void;
  setConnectionPhase: (phase: ConnectionPhase) => void;
  setConnectionId: (id: ConnectionId | null) => void;
  setConfig: (config: Protobuf.Config.Config) => void;
  setModuleConfig: (config: Protobuf.ModuleConfig.ModuleConfig) => void;
  getEffectiveConfig<K extends ValidConfigType>(
    payloadVariant: K,
  ): Protobuf.LocalOnly.LocalConfig[K] | undefined;
  getEffectiveModuleConfig<K extends ValidModuleConfigType>(
    payloadVariant: K,
  ): Protobuf.LocalOnly.LocalModuleConfig[K] | undefined;
  setHardware: (hardware: Protobuf.Mesh.MyNodeInfo) => void;
  setActiveNode: (node: number) => void;
  setPendingSettingsChanges: (state: boolean) => void;
  addChannel: (channel: Protobuf.Channel.Channel) => void;
  addWaypoint: (
    waypoint: Protobuf.Mesh.Waypoint,
    channel: Types.ChannelNumber,
    from: number,
    rxTime: Date,
  ) => void;
  removeWaypoint: (waypointId: number, toMesh: boolean) => Promise<void>;
  getWaypoint: (waypointId: number) => WaypointWithMetadata | undefined;
  addConnection: (connection: MeshDevice) => void;
  addTraceRoute: (
    traceroute: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>,
  ) => void;
  addMetadata: (from: number, metadata: Protobuf.Mesh.DeviceMetadata) => void;
  setDialogOpen: (dialog: DialogVariant, open: boolean) => void;
  getDialogOpen: (dialog: DialogVariant) => boolean;
  setMessageDraft: (message: string) => void;
  sendAdminMessage: (message: Protobuf.Admin.AdminMessage) => void;
  addClientNotification: (
    clientNotificationPacket: Protobuf.Mesh.ClientNotification,
  ) => void;
  removeClientNotification: (index: number) => void;
  getClientNotification: (
    index: number,
  ) => Protobuf.Mesh.ClientNotification | undefined;
  addNeighborInfo: (
    nodeNum: number,
    neighborInfo: Protobuf.Mesh.NeighborInfo,
  ) => void;
  getNeighborInfo: (nodeNum: number) => Protobuf.Mesh.NeighborInfo | undefined;
}

export interface deviceState {
  addDevice: (id: number) => Device;
  removeDevice: (id: number) => void;
  getDevices: () => Device[];
  getDevice: (id: number) => Device | undefined;

  // Saved connections management
  savedConnections: Connection[];
  addSavedConnection: (connection: Connection) => void;
  updateSavedConnection: (
    id: ConnectionId,
    updates: Partial<Connection>,
  ) => void;
  removeSavedConnection: (id: ConnectionId) => void;
  getSavedConnections: () => Connection[];

  // Active connection tracking
  activeConnectionId: ConnectionId | null;
  setActiveConnectionId: (id: ConnectionId | null) => void;
  getActiveConnectionId: () => ConnectionId | null;

  // Helper selectors for connection ↔ device relationships
  getActiveConnection: () => Connection | undefined;
  getDeviceForConnection: (id: ConnectionId) => Device | undefined;
  getConnectionForDevice: (deviceId: number) => Connection | undefined;
}

interface PrivateDeviceState extends deviceState {
  devices: Map<number, Device>;
}

type DevicePersisted = {
  devices: Map<number, DeviceData>;
  savedConnections: Connection[];
};

function deviceFactory(
  id: number,
  get: () => PrivateDeviceState,
  set: typeof useDeviceStore.setState,
  data?: Partial<DeviceData>,
): Device {
  const myNodeNum = data?.myNodeNum;
  const traceroutes =
    data?.traceroutes ??
    new Map<number, Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>[]>();
  const waypoints = data?.waypoints ?? [];
  const neighborInfo =
    data?.neighborInfo ?? new Map<number, Protobuf.Mesh.NeighborInfo>();
  return {
    id,
    myNodeNum,
    traceroutes,
    waypoints,
    neighborInfo,

    status: Types.DeviceStatusEnum.DeviceDisconnected,
    connectionPhase: "disconnected",
    connectionId: null,
    channels: new Map(),
    config: create(Protobuf.LocalOnly.LocalConfigSchema),
    moduleConfig: create(Protobuf.LocalOnly.LocalModuleConfigSchema),
    hardware: create(Protobuf.Mesh.MyNodeInfoSchema),
    metadata: new Map(),
    connection: undefined,
    activeNode: 0,
    dialog: {
      import: false,
      QR: false,
      shutdown: false,
      reboot: false,
      deviceName: false,
      nodeRemoval: false,
      pkiBackup: false,
      nodeDetails: false,
      unsafeRoles: false,
      refreshKeys: false,
      deleteMessages: false,
      managedMode: false,
      clientNotification: false,
      resetNodeDb: false,
      clearAllStores: false,
      factoryResetDevice: false,
      factoryResetConfig: false,
    },
    pendingSettingsChanges: false,
    messageDraft: "",
    clientNotifications: [],

    setStatus: (status: Types.DeviceStatusEnum) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (device) {
            device.status = status;
          }
        }),
      );
    },
    setConnectionPhase: (phase: ConnectionPhase) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (device) {
            device.connectionPhase = phase;
          }
        }),
      );
    },
    setConnectionId: (connectionId: ConnectionId | null) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (device) {
            device.connectionId = connectionId;
          }
        }),
      );
    },
    setConfig: (config: Protobuf.Config.Config) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (device) {
            switch (config.payloadVariant.case) {
              case "device": {
                device.config.device = config.payloadVariant.value;
                break;
              }
              case "position": {
                device.config.position = config.payloadVariant.value;
                break;
              }
              case "power": {
                device.config.power = config.payloadVariant.value;
                break;
              }
              case "network": {
                device.config.network = config.payloadVariant.value;
                break;
              }
              case "display": {
                device.config.display = config.payloadVariant.value;
                break;
              }
              case "lora": {
                device.config.lora = config.payloadVariant.value;
                break;
              }
              case "bluetooth": {
                device.config.bluetooth = config.payloadVariant.value;
                break;
              }
              case "security": {
                device.config.security = config.payloadVariant.value;
              }
            }
          }
        }),
      );
    },
    setModuleConfig: (config: Protobuf.ModuleConfig.ModuleConfig) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (device) {
            switch (config.payloadVariant.case) {
              case "mqtt": {
                device.moduleConfig.mqtt = config.payloadVariant.value;
                break;
              }
              case "serial": {
                device.moduleConfig.serial = config.payloadVariant.value;
                break;
              }
              case "externalNotification": {
                device.moduleConfig.externalNotification =
                  config.payloadVariant.value;
                break;
              }
              case "storeForward": {
                device.moduleConfig.storeForward = config.payloadVariant.value;
                break;
              }
              case "rangeTest": {
                device.moduleConfig.rangeTest = config.payloadVariant.value;
                break;
              }
              case "telemetry": {
                device.moduleConfig.telemetry = config.payloadVariant.value;
                break;
              }
              case "cannedMessage": {
                device.moduleConfig.cannedMessage = config.payloadVariant.value;
                break;
              }
              case "audio": {
                device.moduleConfig.audio = config.payloadVariant.value;
                break;
              }
              case "neighborInfo": {
                device.moduleConfig.neighborInfo = config.payloadVariant.value;
                break;
              }
              case "ambientLighting": {
                device.moduleConfig.ambientLighting =
                  config.payloadVariant.value;
                break;
              }
              case "detectionSensor": {
                device.moduleConfig.detectionSensor =
                  config.payloadVariant.value;
                break;
              }
              case "paxcounter": {
                device.moduleConfig.paxcounter = config.payloadVariant.value;
                break;
              }
              case "remoteHardware": {
                device.moduleConfig.remoteHardware =
                  config.payloadVariant.value;
                break;
              }
              case "statusmessage": {
                device.moduleConfig.statusmessage = config.payloadVariant.value;
                break;
              }
              case "trafficManagement": {
                device.moduleConfig.trafficManagement =
                  config.payloadVariant.value;
                break;
              }
              case "tak": {
                device.moduleConfig.tak = config.payloadVariant.value;
                break;
              }
            }
          }
        }),
      );
    },
    getEffectiveConfig<K extends ValidConfigType>(
      payloadVariant: K,
    ): Protobuf.LocalOnly.LocalConfig[K] | undefined {
      if (!payloadVariant) {
        return;
      }
      const device = get().devices.get(id);
      return device?.config[payloadVariant];
    },
    getEffectiveModuleConfig<K extends ValidModuleConfigType>(
      payloadVariant: K,
    ): Protobuf.LocalOnly.LocalModuleConfig[K] | undefined {
      const device = get().devices.get(id);
      return device?.moduleConfig[payloadVariant];
    },

    setHardware: (hardware: Protobuf.Mesh.MyNodeInfo) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const newDevice = draft.devices.get(id);
          if (!newDevice) {
            throw new Error(`No DeviceStore found for id: ${id}`);
          }
          newDevice.myNodeNum = hardware.myNodeNum;

          for (const [otherId, oldStore] of draft.devices) {
            if (otherId === id || oldStore.myNodeNum !== hardware.myNodeNum) {
              continue;
            }
            newDevice.traceroutes = oldStore.traceroutes;
            newDevice.neighborInfo = oldStore.neighborInfo;

            // Take this opportunity to remove stale waypoints
            newDevice.waypoints = oldStore.waypoints.filter(
              (waypoint) => !waypoint?.expire || waypoint.expire > Date.now(),
            );

            // Drop old device
            draft.devices.delete(otherId);
          }

          newDevice.hardware = hardware; // Always replace hardware with latest
        }),
      );
    },
    setPendingSettingsChanges: (state) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (device) {
            device.pendingSettingsChanges = state;
          }
        }),
      );
    },
    addChannel: (channel: Protobuf.Channel.Channel) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (device) {
            device.channels.set(channel.index, channel);
          }
        }),
      );
    },
    addWaypoint: (waypoint, channel, from, rxTime) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return undefined;
          }

          const index = device.waypoints.findIndex(
            (wp) => wp.id === waypoint.id,
          );

          if (index !== -1) {
            const created =
              device.waypoints[index]?.metadata.created ?? new Date();
            const updatedWaypoint = {
              ...waypoint,
              metadata: { created, updated: rxTime, from, channel },
            };

            // Remove existing waypoint
            device.waypoints.splice(index, 1);

            // Push new if no expiry or not expired
            if (waypoint.expire === 0 || waypoint.expire > Date.now()) {
              device.waypoints.push(updatedWaypoint);
            }
          } else if (
            // only add if set to never expire or not already expired
            waypoint.expire === 0 ||
            (waypoint.expire !== 0 && waypoint.expire < Date.now())
          ) {
            device.waypoints.push({
              ...waypoint,
              metadata: { created: rxTime, from, channel },
            });
          }

          // Enforce retention limit
          evictOldestEntries(device.waypoints, WAYPOINT_RETENTION_NUM);
        }),
      );
    },
    removeWaypoint: async (waypointId: number, toMesh: boolean) => {
      const device = get().devices.get(id);
      if (!device) {
        return;
      }

      const waypoint = device.waypoints.find((wp) => wp.id === waypointId);
      if (!waypoint) {
        return;
      }

      if (toMesh) {
        if (!device.connection) {
          return;
        }

        const waypointToBroadcast = create(Protobuf.Mesh.WaypointSchema, {
          id: waypoint.id, // Bare minimum to delete a waypoint
          lockedTo: 0,
          name: "",
          description: "",
          icon: 0,
          expire: 1,
        });

        await device.connection.sendWaypoint(
          waypointToBroadcast,
          "broadcast",
          waypoint.metadata.channel,
        );
      }

      // Remove from store
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }

          const idx = device.waypoints.findIndex(
            (waypoint) => waypoint.id === waypointId,
          );
          if (idx >= 0) {
            device.waypoints.splice(idx, 1);
          }
        }),
      );
    },
    getWaypoint: (waypointId: number) => {
      const device = get().devices.get(id);
      if (!device) {
        return;
      }

      return device.waypoints.find((waypoint) => waypoint.id === waypointId);
    },
    setActiveNode: (node) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (device) {
            device.activeNode = node;
          }
        }),
      );
    },
    addConnection: (connection) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (device) {
            device.connection = connection as unknown as Draft<MeshDevice>;
          }
        }),
      );
    },
    addMetadata: (from, metadata) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (device) {
            device.metadata.set(from, metadata);
          }
        }),
      );
    },
    addTraceRoute: (traceroute) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }
          const routes = device.traceroutes.get(traceroute.from) ?? [];
          routes.push(traceroute);
          device.traceroutes.set(traceroute.from, routes);

          // Enforce retention limit, both in terms of targets (device.traceroutes) and routes per target (routes)
          evictOldestEntries(routes, TRACEROUTE_ROUTE_RETENTION_NUM);
          evictOldestEntries(
            device.traceroutes,
            TRACEROUTE_TARGET_RETENTION_NUM,
          );
        }),
      );
    },
    setDialogOpen: (dialog: DialogVariant, open: boolean) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (device) {
            device.dialog[dialog] = open;
          }
        }),
      );
    },
    getDialogOpen: (dialog: DialogVariant) => {
      const device = get().devices.get(id);
      if (!device) {
        throw new Error(`Device ${id} not found`);
      }
      return device.dialog[dialog];
    },

    setMessageDraft: (message: string) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (device) {
            device.messageDraft = message;
          }
        }),
      );
    },
    sendAdminMessage(message: Protobuf.Admin.AdminMessage) {
      const device = get().devices.get(id);
      if (!device) {
        return;
      }

      device.connection?.sendPacket(
        toBinary(Protobuf.Admin.AdminMessageSchema, message),
        Protobuf.Portnums.PortNum.ADMIN_APP,
        "self",
      );
    },

    addClientNotification: (
      clientNotificationPacket: Protobuf.Mesh.ClientNotification,
    ) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }
          device.clientNotifications.push(clientNotificationPacket);
        }),
      );
    },
    removeClientNotification: (index: number) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }
          device.clientNotifications.splice(index, 1);
        }),
      );
    },
    getClientNotification: (index: number) => {
      const device = get().devices.get(id);
      if (!device) {
        return;
      }
      return device.clientNotifications[index];
    },
    addNeighborInfo: (
      nodeId: number,
      neighborInfo: Protobuf.Mesh.NeighborInfo,
    ) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }

          // Replace any existing neighbor info for this nodeId
          device.neighborInfo.set(nodeId, neighborInfo);
        }),
      );
    },

    getNeighborInfo: (nodeNum: number) => {
      const device = get().devices.get(id);
      if (!device) {
        return;
      }
      return device.neighborInfo.get(nodeNum);
    },
  };
}

export const deviceStoreInitializer: StateCreator<PrivateDeviceState> = (
  set,
  get,
) => ({
  devices: new Map(),
  savedConnections: [],
  activeConnectionId: null,

  addDevice: (id) => {
    const existing = get().devices.get(id);
    if (existing) {
      return existing;
    }

    const device = deviceFactory(id, get, set);
    set(
      produce<PrivateDeviceState>((draft) => {
        draft.devices = new Map(draft.devices).set(
          id,
          device as unknown as Draft<Device>,
        );

        // Enforce retention limit
        evictOldestEntries(draft.devices, DEVICESTORE_RETENTION_NUM);
      }),
    );

    return device;
  },
  removeDevice: (id) => {
    set(
      produce<PrivateDeviceState>((draft) => {
        const updated = new Map(draft.devices);
        updated.delete(id);
        draft.devices = updated;
      }),
    );
  },
  getDevices: () => Array.from(get().devices.values()),
  getDevice: (id) => get().devices.get(id),

  addSavedConnection: (connection) => {
    set(
      produce<PrivateDeviceState>((draft) => {
        draft.savedConnections.push(connection);
      }),
    );
  },
  updateSavedConnection: (id, updates) => {
    set(
      produce<PrivateDeviceState>((draft) => {
        const conn = draft.savedConnections.find(
          (c: Connection) => c.id === id,
        );
        if (conn) {
          for (const key in updates) {
            if (Object.hasOwn(updates, key)) {
              (conn as Record<string, unknown>)[key] =
                updates[key as keyof typeof updates];
            }
          }
        }
      }),
    );
  },
  removeSavedConnection: (id) => {
    set(
      produce<PrivateDeviceState>((draft) => {
        draft.savedConnections = draft.savedConnections.filter(
          (c: Connection) => c.id !== id,
        );
      }),
    );
  },
  getSavedConnections: () => get().savedConnections,

  setActiveConnectionId: (id) => {
    set(
      produce<PrivateDeviceState>((draft) => {
        draft.activeConnectionId = id;
      }),
    );
  },
  getActiveConnectionId: () => get().activeConnectionId,

  getActiveConnection: () => {
    const activeId = get().activeConnectionId;
    if (!activeId) {
      return undefined;
    }
    return get().savedConnections.find((c) => c.id === activeId);
  },
  getDeviceForConnection: (id) => {
    const connection = get().savedConnections.find((c) => c.id === id);
    if (!connection?.meshDeviceId) {
      return undefined;
    }
    return get().devices.get(connection.meshDeviceId);
  },
  getConnectionForDevice: (deviceId) => {
    return get().savedConnections.find((c) => c.meshDeviceId === deviceId);
  },
});

const persistOptions: PersistOptions<PrivateDeviceState, DevicePersisted> = {
  name: IDB_KEY_NAME,
  storage: createStorage<DevicePersisted>(),
  version: CURRENT_STORE_VERSION,
  partialize: (s): DevicePersisted => ({
    devices: new Map(
      Array.from(s.devices.entries()).map(([id, db]) => [
        id,
        {
          id: db.id,
          myNodeNum: db.myNodeNum,
          traceroutes: db.traceroutes,
          waypoints: db.waypoints,
          neighborInfo: db.neighborInfo,
        },
      ]),
    ),
    savedConnections: s.savedConnections,
  }),
  onRehydrateStorage: () => (state) => {
    if (!state) {
      return;
    }
    console.debug(
      "DeviceStore: Rehydrating state with ",
      state.devices.size,
      " devices -",
      state.devices,
    );

    useDeviceStore.setState(
      produce<PrivateDeviceState>((draft) => {
        const rebuilt = new Map<number, Device>();
        for (const [id, data] of (
          draft.devices as unknown as Map<number, DeviceData>
        ).entries()) {
          if (data.myNodeNum !== undefined) {
            // Only rebuild if there is a nodenum set otherwise orphan dbs will acumulate
            rebuilt.set(
              id,
              deviceFactory(
                id,
                useDeviceStore.getState,
                useDeviceStore.setState,
                data,
              ),
            );
          }
        }
        draft.devices = rebuilt as unknown as Map<number, Draft<Device>>;

        // Stale in-flight states can't survive a reload — no JS code is
        // running that could complete them. Reset any persisted
        // "connecting" / "configuring" / "disconnecting" entries to
        // "disconnected" so the connecting overlay (which keys off
        // these statuses) doesn't get stuck visible on cold boot.
        for (const conn of draft.savedConnections) {
          if (
            conn.status === "connecting" ||
            conn.status === "configuring" ||
            conn.status === "disconnecting"
          ) {
            conn.status = "disconnected";
            conn.error = undefined;
          }
        }
      }),
    );
  },
};

export const useDeviceStore = createStore(
  subscribeWithSelector(persist(deviceStoreInitializer, persistOptions)),
);
