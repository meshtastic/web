import { create, toBinary } from "@bufbuild/protobuf";
import type {
  ChangeEntry,
  ConfigChangeKey,
  ValidConfigType,
  ValidModuleConfigType,
} from "@components/Settings/types.ts";
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
  WaypointWithMetadata,
} from "./types.ts";

// ConnectionId is now just a number (database ID)
type ConnectionId = number;

// Helper function to serialize change keys for Map storage
function serializeKey(key: ConfigChangeKey): string {
  if (key.type === "config" || key.type === "moduleConfig") {
    return `${key.type}:${key.variant}`;
  }
  if (key.type === "channel") {
    return `${key.type}:${key.index}`;
  }
  if (key.type === "user") {
    return "user";
  }
  if (key.type === "adminMessage") {
    return `${key.type}:${key.variant}:${key.id}`;
  }
  return "";
}

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
  config: Protobuf.LocalOnly.LocalConfig;
  moduleConfig: Protobuf.LocalOnly.LocalModuleConfig;
};
export type ConnectionPhase =
  | "disconnected"
  | "connecting"
  | "configuring"
  | "connected"    // Config-only stage complete, node-info still loading
  | "configured";  // Full two-stage configuration complete

export interface Device extends DeviceData {
  // Ephemeral state (not persisted)
  status: Types.DeviceStatusEnum;
  connectionPhase: ConnectionPhase;
  connectionId: ConnectionId | null;
  changes: Map<string, ChangeEntry>; // Unified change tracking
  queuedAdminMessages: Protobuf.Admin.AdminMessage[]; // Queued admin messages
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
  setChange: (
    key: ConfigChangeKey,
    value: unknown,
    originalValue?: unknown,
  ) => void;
  clearAllChanges: () => void;
  hasConfigChange: (variant: ValidConfigType) => boolean;
  hasModuleConfigChange: (variant: ValidModuleConfigType) => boolean;
  hasChannelChange: (index: Types.ChannelNumber) => boolean;
  hasUserChange: () => boolean;
  getConfigChangeCount: () => number;
  getModuleConfigChangeCount: () => number;
  getChannelChangeCount: () => number;
  getAllConfigChanges: () => Protobuf.Config.Config[];
  getAllModuleConfigChanges: () => Protobuf.ModuleConfig.ModuleConfig[];
  getAllChannelChanges: () => Protobuf.Channel.Channel[];
  queueAdminMessage: (message: Protobuf.Admin.AdminMessage) => void;
  getAllQueuedAdminMessages: () => Protobuf.Admin.AdminMessage[];
  getAdminMessageChangeCount: () => number;
}

export interface deviceState {
  addDevice: (id: number) => Device;
  removeDevice: (id: number) => void;
  getDevices: () => Device[];
  getDevice: (id: number) => Device | undefined;

  // Active connection tracking (connections now stored in SQLite)
  activeConnectionId: ConnectionId | null;
  setActiveConnectionId: (id: ConnectionId | null) => void;
  getActiveConnectionId: () => ConnectionId | null;
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
    connectionPhase: "disconnected",
    connectionId: null,
    config: data?.config ?? create(Protobuf.LocalOnly.LocalConfigSchema),
    moduleConfig:
      data?.moduleConfig ?? create(Protobuf.LocalOnly.LocalModuleConfigSchema),
    changes: new Map(),
    queuedAdminMessages: [],
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
      if (!device) {
        return;
      }

      const workingValue = device.changes.get(
        serializeKey({ type: "config", variant: payloadVariant }),
      )?.value as Protobuf.LocalOnly.LocalConfig[K] | undefined;

      return {
        ...device.config[payloadVariant],
        ...workingValue,
      };
    },
    getEffectiveModuleConfig<K extends ValidModuleConfigType>(
      payloadVariant: K,
    ): Protobuf.LocalOnly.LocalModuleConfig[K] | undefined {
      const device = get().devices.get(id);
      if (!device) {
        return;
      }

      const workingValue = device.changes.get(
        serializeKey({ type: "moduleConfig", variant: payloadVariant }),
      )?.value as Protobuf.LocalOnly.LocalModuleConfig[K] | undefined;

      return {
        ...device.moduleConfig[payloadVariant],
        ...workingValue,
      };
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
    addChannel: async (channel: Protobuf.Channel.Channel) => {
      // Channels are now stored in the database
      const { channelRepo } = await import("@db");
      const { fromByteArray } = await import("base64-js");

      await channelRepo.upsertChannel({
        deviceId: id,
        channelIndex: channel.index,
        role: channel.role,
        name: channel.settings?.name,
        psk: channel.settings?.psk
          ? fromByteArray(channel.settings.psk)
          : undefined,
        uplinkEnabled: channel.settings?.uplinkEnabled,
        downlinkEnabled: channel.settings?.downlinkEnabled,
        positionPrecision: channel.settings?.moduleSettings?.positionPrecision,
      });
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

    // Change tracking methods
    setChange: (
      key: ConfigChangeKey,
      value: unknown,
      originalValue?: unknown,
    ) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }
          const serializedKey = serializeKey(key);
          device.changes.set(serializedKey, {
            key,
            value,
            timestamp: Date.now(),
            originalValue,
          });
        }),
      );
    },

    clearAllChanges: () => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }
          device.changes.clear();
          device.queuedAdminMessages = [];
        }),
      );
    },

    hasConfigChange: (variant: ValidConfigType) => {
      const device = get().devices.get(id);
      if (!device) {
        return false;
      }
      return device.changes.has(serializeKey({ type: "config", variant }));
    },

    hasModuleConfigChange: (variant: ValidModuleConfigType) => {
      const device = get().devices.get(id);
      if (!device) {
        return false;
      }
      return device.changes.has(
        serializeKey({ type: "moduleConfig", variant }),
      );
    },

    hasChannelChange: (index: Types.ChannelNumber) => {
      const device = get().devices.get(id);
      if (!device) {
        return false;
      }
      return device.changes.has(serializeKey({ type: "channel", index }));
    },

    hasUserChange: () => {
      const device = get().devices.get(id);
      if (!device) {
        return false;
      }
      return device.changes.has(serializeKey({ type: "user" }));
    },

    getConfigChangeCount: () => {
      const device = get().devices.get(id);
      if (!device) {
        return 0;
      }
      let count = 0;
      for (const [key] of device.changes) {
        if (key.startsWith("config:")) {
          count++;
        }
      }
      return count;
    },

    getModuleConfigChangeCount: () => {
      const device = get().devices.get(id);
      if (!device) {
        return 0;
      }
      let count = 0;
      for (const [key] of device.changes) {
        if (key.startsWith("moduleConfig:")) {
          count++;
        }
      }
      return count;
    },

    getChannelChangeCount: () => {
      const device = get().devices.get(id);
      if (!device) {
        return 0;
      }
      let count = 0;
      for (const [key] of device.changes) {
        if (key.startsWith("channel:")) {
          count++;
        }
      }
      return count;
    },

    getAllConfigChanges: () => {
      const device = get().devices.get(id);
      if (!device) {
        return [];
      }
      const changes: Protobuf.Config.Config[] = [];
      for (const [key, entry] of device.changes) {
        if (key.startsWith("config:")) {
          const variant = key.split(":")[1] as ValidConfigType;
          changes.push(
            create(Protobuf.Config.ConfigSchema, {
              payloadVariant: {
                case: variant,
                value: entry.value,
              },
            }),
          );
        }
      }
      return changes;
    },

    getAllModuleConfigChanges: () => {
      const device = get().devices.get(id);
      if (!device) {
        return [];
      }
      const changes: Protobuf.ModuleConfig.ModuleConfig[] = [];
      for (const [key, entry] of device.changes) {
        if (key.startsWith("moduleConfig:")) {
          const variant = key.split(":")[1] as ValidModuleConfigType;
          changes.push(
            create(Protobuf.ModuleConfig.ModuleConfigSchema, {
              payloadVariant: {
                case: variant,
                value: entry.value,
              },
            }),
          );
        }
      }
      return changes;
    },

    getAllChannelChanges: () => {
      const device = get().devices.get(id);
      if (!device) {
        return [];
      }
      const changes: Protobuf.Channel.Channel[] = [];
      for (const [key, entry] of device.changes) {
        if (key.startsWith("channel:")) {
          changes.push(entry.value as Protobuf.Channel.Channel);
        }
      }
      return changes;
    },

    queueAdminMessage: (message: Protobuf.Admin.AdminMessage) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            return;
          }
          device.queuedAdminMessages.push(message);
        }),
      );
    },

    getAllQueuedAdminMessages: () => {
      const device = get().devices.get(id);
      if (!device) {
        return [];
      }
      return device.queuedAdminMessages;
    },

    getAdminMessageChangeCount: () => {
      const device = get().devices.get(id);
      if (!device) {
        return 0;
      }
      return device.queuedAdminMessages.length;
    },
  };
}

export const deviceStoreInitializer: StateCreator<PrivateDeviceState> = (
  set,
  get,
) => ({
  devices: new Map(),
  activeConnectionId: null,

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

  setActiveConnectionId: (id) => {
    set(
      produce<PrivateDeviceState>((draft) => {
        draft.activeConnectionId = id;
      }),
    );
  },
  getActiveConnectionId: () => get().activeConnectionId,
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
          config: db.config,
          moduleConfig: db.moduleConfig,
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

export const useDeviceStore = createStore(
  subscribeWithSelector(persist(deviceStoreInitializer, persistOptions)),
);
