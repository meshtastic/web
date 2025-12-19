import logger from "@core/services/logger";
import { create, toBinary } from "@bufbuild/protobuf";
import type {
  ChangeEntry,
  ConfigChangeKey,
  ValidConfigType,
  ValidModuleConfigType,
} from "@components/Settings/types.ts";
import { type MeshDevice, Protobuf, Types } from "@meshtastic/core";
import { produce } from "immer";
import { create as createStore, type StateCreator } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Dialogs, DialogVariant, WaypointWithMetadata } from "./types.ts";

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

const _TRACEROUTE_TARGET_RETENTION_NUM = 100; // Number of traceroutes targets to keep
const _TRACEROUTE_ROUTE_RETENTION_NUM = 100; // Number of traceroutes to keep per target
const _WAYPOINT_RETENTION_NUM = 100;

// Config types expected during Stage 1 configuration
const DEVICE_CONFIG_TYPES = [
  "device",
  "position",
  "power",
  "network",
  "display",
  "lora",
  "bluetooth",
  "security",
] as const;

const MODULE_CONFIG_TYPES = [
  "mqtt",
  "serial",
  "externalNotification",
  "storeForward",
  "rangeTest",
  "telemetry",
  "cannedMessage",
  "audio",
  "remoteHardware",
  "neighborInfo",
  "ambientLighting",
  "detectionSensor",
  "paxcounter",
] as const;

const DEVICE_CONFIG_SET = new Set<string>(DEVICE_CONFIG_TYPES);
const MODULE_CONFIG_SET = new Set<string>(MODULE_CONFIG_TYPES);

export const TOTAL_CONFIG_COUNT =
  DEVICE_CONFIG_TYPES.length + MODULE_CONFIG_TYPES.length;

export interface ConfigProgress {
  receivedConfigs: Set<string>;
  total: number;
}

export function getConfigProgressPercent(progress: ConfigProgress): number {
  if (progress.total === 0) return 0;
  return Math.round((progress.receivedConfigs.size / progress.total) * 100);
}

type DeviceData = {
  // Persisted data
  id: number;
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
  | "connected" // Config-only stage complete, node-info still loading
  | "configured"; // Full two-stage configuration complete

export interface Device extends DeviceData {
  // Ephemeral state (not persisted)
  status: Types.DeviceStatusEnum;
  connectionPhase: ConnectionPhase;
  connectionId: ConnectionId | null;
  configProgress: ConfigProgress; // Track config loading progress
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
  resetConfigProgress: () => void;
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
  getMyNodeNum: () => number | undefined;
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

  // Active device tracking
  activeDeviceId: number;
  setActiveDeviceId: (id: number) => void;
  getActiveDeviceId: () => number;

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
  const traceroutes =
    data?.traceroutes ??
    new Map<number, Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>[]>();
  const waypoints = data?.waypoints ?? [];
  const neighborInfo =
    data?.neighborInfo ?? new Map<number, Protobuf.Mesh.NeighborInfo>();
  return {
    id,
    traceroutes,
    waypoints,
    neighborInfo,

    status: Types.DeviceStatusEnum.DeviceDisconnected,
    connectionPhase: "disconnected",
    connectionId: null,
    configProgress: { receivedConfigs: new Set<string>(), total: TOTAL_CONFIG_COUNT },
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
      factoryResetDevice: false,
      factoryResetConfig: false,
      tracerouteResponse: false,
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
    resetConfigProgress: () => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (device) {
            device.configProgress = {
              receivedConfigs: new Set<string>(),
              total: TOTAL_CONFIG_COUNT,
            };
          }
        }),
      );
    },
    setConfig: (config: Protobuf.Config.Config) => {
      logger.debug(
        `[DeviceStore] setConfig called for device ${id}, variant: ${config.payloadVariant.case}`,
      );
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (!device) {
            logger.warn(
              `[DeviceStore] setConfig: device ${id} not found in store`,
            );
            return;
          }

          // Track config progress (only count known config types)
          if (
            config.payloadVariant.case &&
            DEVICE_CONFIG_SET.has(config.payloadVariant.case)
          ) {
            device.configProgress.receivedConfigs.add(
              `config:${config.payloadVariant.case}`,
            );
          }

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
              // Persist display units to preferences for easy access across UI
              import("@data/repositories/index.ts").then(
                ({ preferencesRepo }) => {
                  preferencesRepo.set(
                    `device:${id}:displayUnits`,
                    config.payloadVariant.value.units,
                  );
                },
              );
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
          logger.debug(
            `[DeviceStore] Config updated for device ${id}, progress: ${device.configProgress.receivedConfigs.size}/${device.configProgress.total}`,
          );
        }),
      );
    },
    setModuleConfig: (config: Protobuf.ModuleConfig.ModuleConfig) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.devices.get(id);
          if (device) {
            // Track config progress (only count known module config types)
            if (
              config.payloadVariant.case &&
              MODULE_CONFIG_SET.has(config.payloadVariant.case)
            ) {
              device.configProgress.receivedConfigs.add(
                `moduleConfig:${config.payloadVariant.case}`,
              );
            }

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
              case "remoteHardware": {
                device.moduleConfig.remoteHardware = config.payloadVariant.value;
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
            logger.debug(
              `[DeviceStore] ModuleConfig updated for device ${id}, progress: ${device.configProgress.receivedConfigs.size}/${device.configProgress.total}`,
            );
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

          for (const [otherId, oldStore] of draft.devices) {
            if (
              otherId === id ||
              oldStore.hardware.myNodeNum !== hardware.myNodeNum
            ) {
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
      const { channelRepo } = await import("@data/index");
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
          // evictOldestEntries(device.waypoints, WAYPOINT_RETENTION_NUM);
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
      // Store in HMR-safe cache
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
          // evictOldestEntries(routes, TRACEROUTE_ROUTE_RETENTION_NUM);
          // evictOldestEntries(
          //   device.traceroutes,
          //   TRACEROUTE_TARGET_RETENTION_NUM,
          // );
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

    getMyNodeNum: () => {
      const device = get().devices.get(id);
      return device?.hardware.myNodeNum;
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
  activeDeviceId: 0,
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
        // evictOldestEntries(draft.devices, DEVICESTORE_RETENTION_NUM);
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

  setActiveDeviceId: (id) => {
    set(
      produce<PrivateDeviceState>((draft) => {
        draft.activeDeviceId = id;
      }),
    );
  },
  getActiveDeviceId: () => get().activeDeviceId,

  setActiveConnectionId: (id) => {
    set(
      produce<PrivateDeviceState>((draft) => {
        draft.activeConnectionId = id;
      }),
    );
  },
  getActiveConnectionId: () => get().activeConnectionId,
});

// LEAVE THIS HERE FOR NOW
// const persistOptions: PersistOptions<PrivateDeviceState, DevicePersisted> = {
//   name: IDB_KEY_NAME,
//   storage: createStorage<DevicePersisted>(),
//   version: CURRENT_STORE_VERSION,
//   partialize: (s): DevicePersisted => ({
//     devices: new Map(Array.from(s.devices.entries())),
//   }),
//   onRehydrateStorage: () => (state) => {
//     if (!state) {
//       return;
//     }

//     console.debug(
//       "DeviceStore: Rehydrating state with ",
//       state.devices.size,
//       " devices -",
//       state.devices,
//     );

//     useDeviceStore.setState(
//       produce<PrivateDeviceState>((draft) => {
//         const rebuilt = new Map<number, Device>();
//         for (const [id, data] of (
//           draft.devices as unknown as Map<number, DeviceData>
//         ).entries()) {
//           const device = deviceFactory(
//             id,
//             useDeviceStore.getState,
//             useDeviceStore.setState,
//             data,
//           );

//           rebuilt.set(id, device);
//         }
//         draft.devices = rebuilt;
//       }),
//     );
//   },
// };

export const useDeviceStore = createStore(
  subscribeWithSelector(deviceStoreInitializer),
);
