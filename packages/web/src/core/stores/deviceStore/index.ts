import { create, toBinary } from "@bufbuild/protobuf";
import { featureFlags } from "@core/services/featureFlags";
import { evictOldestEntries } from "@core/stores/utils/evictOldestEntries.ts";
import { createStorage } from "@core/stores/utils/indexDB.ts";
import { type MeshDevice, Protobuf, Types } from "@meshtastic/core";
import { produce } from "immer";
import { create as createStore, type StateCreator } from "zustand";
import {
  type PersistOptions,
  persist,
  subscribeWithSelector,
} from "zustand/middleware";
import type {
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
export interface Device extends DeviceData {
  // Ephemeral state (not persisted)
  status: Types.DeviceStatusEnum;
  channels: Map<Types.ChannelNumber, Protobuf.Channel.Channel>;
  config: Protobuf.LocalOnly.LocalConfig;
  moduleConfig: Protobuf.LocalOnly.LocalModuleConfig;
  workingConfig: Protobuf.Config.Config[];
  workingModuleConfig: Protobuf.ModuleConfig.ModuleConfig[];
  workingChannelConfig: Protobuf.Channel.Channel[];
  hardware: Protobuf.Mesh.MyNodeInfo;
  metadata: Map<number, Protobuf.Mesh.DeviceMetadata>;
  connection?: MeshDevice;
  activeNode: number;
  pendingSettingsChanges: boolean;
  messageDraft: string;
  unreadCounts: Map<number, number>;
  dialog: Dialogs;
  clientNotifications: Protobuf.Mesh.ClientNotification[];

  setStatus: (status: Types.DeviceStatusEnum) => void;
  setConfig: (config: Protobuf.Config.Config) => void;
  setModuleConfig: (config: Protobuf.ModuleConfig.ModuleConfig) => void;
  setWorkingConfig: (config: Protobuf.Config.Config) => void;
  setWorkingModuleConfig: (config: Protobuf.ModuleConfig.ModuleConfig) => void;
  getWorkingConfig<K extends ValidConfigType>(
    payloadVariant: K,
  ): Protobuf.LocalOnly.LocalConfig[K] | undefined;
  getWorkingModuleConfig<K extends ValidModuleConfigType>(
    payloadVariant: K,
  ): Protobuf.LocalOnly.LocalModuleConfig[K] | undefined;
  removeWorkingConfig: (payloadVariant?: ValidConfigType) => void;
  removeWorkingModuleConfig: (payloadVariant?: ValidModuleConfigType) => void;
  getEffectiveConfig<K extends ValidConfigType>(
    payloadVariant: K,
  ): Protobuf.LocalOnly.LocalConfig[K] | undefined;
  getEffectiveModuleConfig<K extends ValidModuleConfigType>(
    payloadVariant: K,
  ): Protobuf.LocalOnly.LocalModuleConfig[K] | undefined;
  setWorkingChannelConfig: (channelNum: Protobuf.Channel.Channel) => void;
  getWorkingChannelConfig: (
    index: Types.ChannelNumber,
  ) => Protobuf.Channel.Channel | undefined;
  removeWorkingChannelConfig: (channelNum?: Types.ChannelNumber) => void;
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
  addConnection: (connection: MeshDevice) => void;
  addTraceRoute: (
    traceroute: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>,
  ) => void;
  addMetadata: (from: number, metadata: Protobuf.Mesh.DeviceMetadata) => void;
  setDialogOpen: (dialog: DialogVariant, open: boolean) => void;
  getDialogOpen: (dialog: DialogVariant) => boolean;
  setMessageDraft: (message: string) => void;
  incrementUnread: (nodeNum: number) => void;
  resetUnread: (nodeNum: number) => void;
  getUnreadCount: (nodeNum: number) => number;
  getAllUnreadCount: () => number;
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
}

interface PrivateDeviceState extends deviceState {
  devices: Map<number, Device>;
}

type DevicePersisted = {
  devices: Map<number, DeviceData>;
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
    channels: new Map(),
    config: create(Protobuf.LocalOnly.LocalConfigSchema),
    moduleConfig: create(Protobuf.LocalOnly.LocalModuleConfigSchema),
    workingConfig: [],
    workingModuleConfig: [],
    workingChannelConfig: [],
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
    unreadCounts: new Map(),
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
            }
          }
        }),
      );
    },
    setWorkingConfig: (config: Protobuf.Config.Config) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }
          const index = device.workingConfig.findIndex(
            (wc) => wc.payloadVariant.case === config.payloadVariant.case,
          );

          if (index !== -1) {
            device.workingConfig[index] = config;
          } else {
            device.workingConfig.push(config);
          }
        }),
      );
    },
    setWorkingModuleConfig: (
      moduleConfig: Protobuf.ModuleConfig.ModuleConfig,
    ) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }
          const index = device.workingModuleConfig.findIndex(
            (wmc) =>
              wmc.payloadVariant.case === moduleConfig.payloadVariant.case,
          );

          if (index !== -1) {
            device.workingModuleConfig[index] = moduleConfig;
          } else {
            device.workingModuleConfig.push(moduleConfig);
          }
        }),
      );
    },

    getWorkingConfig<K extends ValidConfigType>(payloadVariant: K) {
      const device = get().devices.get(id);
      if (!device) {
        return;
      }

      const workingConfig = device.workingConfig.find(
        (c) => c.payloadVariant.case === payloadVariant,
      );

      if (
        workingConfig?.payloadVariant.case === "deviceUi" ||
        workingConfig?.payloadVariant.case === "sessionkey"
      ) {
        return;
      }

      return workingConfig?.payloadVariant
        .value as Protobuf.LocalOnly.LocalConfig[K];
    },
    getWorkingModuleConfig<K extends ValidModuleConfigType>(
      payloadVariant: K,
    ): Protobuf.LocalOnly.LocalModuleConfig[K] | undefined {
      const device = get().devices.get(id);
      if (!device) {
        return;
      }

      return device.workingModuleConfig.find(
        (c) => c.payloadVariant.case === payloadVariant,
      )?.payloadVariant.value as Protobuf.LocalOnly.LocalModuleConfig[K];
    },

    removeWorkingConfig: (payloadVariant?: ValidConfigType) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }

          if (!payloadVariant) {
            device.workingConfig = [];
            return;
          }

          const index = device.workingConfig.findIndex(
            (wc: Protobuf.Config.Config) =>
              wc.payloadVariant.case === payloadVariant,
          );

          if (index !== -1) {
            device.workingConfig.splice(index, 1);
          }
        }),
      );
    },
    removeWorkingModuleConfig: (payloadVariant?: ValidModuleConfigType) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }

          if (!payloadVariant) {
            device.workingModuleConfig = [];
            return;
          }

          const index = device.workingModuleConfig.findIndex(
            (wc: Protobuf.ModuleConfig.ModuleConfig) =>
              wc.payloadVariant.case === payloadVariant,
          );

          if (index !== -1) {
            device.workingModuleConfig.splice(index, 1);
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
      if (!device) {
        return;
      }

      return {
        ...device.config[payloadVariant],
        ...device.workingConfig.find(
          (c) => c.payloadVariant.case === payloadVariant,
        )?.payloadVariant.value,
      };
    },
    getEffectiveModuleConfig<K extends ValidModuleConfigType>(
      payloadVariant: K,
    ): Protobuf.LocalOnly.LocalModuleConfig[K] | undefined {
      const device = get().devices.get(id);
      if (!device) {
        return;
      }

      return {
        ...device.moduleConfig[payloadVariant],
        ...device.workingModuleConfig.find(
          (c) => c.payloadVariant.case === payloadVariant,
        )?.payloadVariant.value,
      };
    },

    setWorkingChannelConfig: (config: Protobuf.Channel.Channel) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }
          const index = device.workingChannelConfig.findIndex(
            (wcc) => wcc.index === config.index,
          );

          if (index !== -1) {
            device.workingChannelConfig[index] = config;
          } else {
            device.workingChannelConfig.push(config);
          }
        }),
      );
    },
    getWorkingChannelConfig: (channelNum: Types.ChannelNumber) => {
      const device = get().devices.get(id);
      if (!device) {
        return;
      }

      const workingChannelConfig = device.workingChannelConfig.find(
        (c) => c.index === channelNum,
      );

      return workingChannelConfig;
    },
    removeWorkingChannelConfig: (channelNum?: Types.ChannelNumber) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }

          if (channelNum === undefined) {
            device.workingChannelConfig = [];
            return;
          }

          const index = device.workingChannelConfig.findIndex(
            (wcc: Protobuf.Channel.Channel) => wcc.index === channelNum,
          );

          if (index !== -1) {
            device.workingChannelConfig.splice(index, 1);
          }
        }),
      );
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
          if (device) {
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

              device.waypoints[index] = updatedWaypoint;
            } else {
              device.waypoints.push({
                ...waypoint,
                metadata: { created: rxTime, from, channel },
              });
            }

            // Enforce retention limit
            evictOldestEntries(device.waypoints, WAYPOINT_RETENTION_NUM);
          }
        }),
      );
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
            device.connection = connection;
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
    incrementUnread: (nodeNum: number) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }
          const currentCount = device.unreadCounts.get(nodeNum) ?? 0;
          device.unreadCounts.set(nodeNum, currentCount + 1);
        }),
      );
    },
    getUnreadCount: (nodeNum: number): number => {
      const device = get().devices.get(id);
      if (!device) {
        return 0;
      }
      return device.unreadCounts.get(nodeNum) ?? 0;
    },
    getAllUnreadCount: (): number => {
      const device = get().devices.get(id);
      if (!device) {
        return 0;
      }
      let totalUnread = 0;
      device.unreadCounts.forEach((count) => {
        totalUnread += count;
      });
      return totalUnread;
    },
    resetUnread: (nodeNum: number) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }
          device.unreadCounts.set(nodeNum, 0);
          if (device.unreadCounts.get(nodeNum) === 0) {
            device.unreadCounts.delete(nodeNum);
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

  addDevice: (id) => {
    const existing = get().devices.get(id);
    if (existing) {
      return existing;
    }

    const device = deviceFactory(id, get, set);
    set(
      produce<PrivateDeviceState>((draft) => {
        draft.devices = new Map(draft.devices).set(id, device);

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
        draft.devices = rebuilt;
      }),
    );
  },
};

// Add persist middleware on the store if the feature flag is enabled
const persistDevices = featureFlags.get("persistDevices");
console.debug(
  `DeviceStore: Persisting devices is ${persistDevices ? "enabled" : "disabled"}`,
);

export const useDeviceStore = persistDevices
  ? createStore(
      subscribeWithSelector(persist(deviceStoreInitializer, persistOptions)),
    )
  : createStore(subscribeWithSelector(deviceStoreInitializer));
