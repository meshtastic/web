import { create, toBinary } from "@bufbuild/protobuf";
import logger from "@core/services/logger";
import { type MeshDevice, Protobuf, type Types } from "@meshtastic/core";
import { toByteArray } from "base64-js";
import { produce } from "immer";
import { type StateCreator, create as createStore } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { WaypointWithMetadata } from "./types.ts";

// ConnectionId is now just a number (database ID)
type ConnectionId = number;

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
export interface ConfigConflict {
  variant: string;
  localValue: unknown;
  remoteValue: unknown;
  originalValue?: unknown;
}

export interface Device extends DeviceData {
  // Ephemeral state (not persisted)
  connectionId?: ConnectionId | null;
  configProgress: ConfigProgress; // Track config loading progress
  queuedAdminMessages: Protobuf.Admin.AdminMessage[]; // Queued admin messages
  hardware: Protobuf.Mesh.MyNodeInfo;
  metadata: Map<number, Protobuf.Mesh.DeviceMetadata>;
  connection?: MeshDevice;
  pendingSettingsChanges: boolean;
  clientNotifications: Protobuf.Mesh.ClientNotification[];

  // Config caching state
  isCachedConfig: boolean; // True when using cached config, false after fresh config received
  configConflicts: Map<string, ConfigConflict>; // Tracks config conflicts by "config:variant" or "moduleConfig:variant"

  // Remote administration state
  remoteAdminTargetNode: number | null; // Node being remotely administered, null = local
  remoteAdminAuthorized: boolean; // Whether authorized to admin the target node
  recentlyConnectedNodes: number[]; // History of nodes (local + remote admin targets)

  setConnectionId: (id: ConnectionId | null) => void;
  resetConfigProgress: () => void;
  setConfig: (config: Protobuf.Config.Config) => void;
  setModuleConfig: (config: Protobuf.ModuleConfig.ModuleConfig) => void;
  setHardware: (hardware: Protobuf.Mesh.MyNodeInfo) => void;
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
  addTraceRoute: (
    traceroute: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>,
  ) => void;
  addMetadata: (from: number, metadata: Protobuf.Mesh.DeviceMetadata) => void;
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
  queueAdminMessage: (message: Protobuf.Admin.AdminMessage) => void;
  getAllQueuedAdminMessages: () => Protobuf.Admin.AdminMessage[];
  getAdminMessageChangeCount: () => number;
  clearQueuedAdminMessages: () => void;

  // Config caching methods
  setCachedConfig: (
    config: Protobuf.LocalOnly.LocalConfig,
    moduleConfig: Protobuf.LocalOnly.LocalModuleConfig,
  ) => void;
  setIsCachedConfig: (isCached: boolean) => void;
  setConfigConflict: (
    type: "config" | "moduleConfig",
    variant: string,
    conflict: ConfigConflict,
  ) => void;
  hasAnyConflicts: () => boolean;
  getConfigConflict: (
    type: "config" | "moduleConfig",
    variant: string,
  ) => ConfigConflict | undefined;
  clearConfigConflicts: () => void;

  // Remote administration methods
  setRemoteAdminTarget: (
    nodeNum: number | null,
    targetPublicKey?: string,
  ) => void;
  getAdminDestination: () => number | "self";
}

// Public API for single-device store
export interface DeviceState {
  // Single device - null when not connected
  device: Device | null;

  // Device lifecycle
  initializeDevice: () => Device;
  clearDevice: () => void;

  // Connection management
  setConnection: (connection: MeshDevice) => void;

  // Active connection tracking (connections now stored in SQLite)
  activeConnectionId: ConnectionId | null;
  setActiveConnectionId: (id: ConnectionId | null) => void;
}

// Internal state includes backward-compat fields during migration
interface PrivateDeviceState extends DeviceState {
  // Legacy fields - to be removed after migration
  devices: Map<number, Device>;
  activeDeviceId: number;
  addDevice: (id: number) => Device;
  removeDevice: (id: number) => void;
  getDevices: () => Device[];
  getDevice: (id: number) => Device | undefined;
  setActiveDeviceId: (id: number) => void;
  getActiveDeviceId: () => number;
  getActiveConnectionId: () => ConnectionId | null;
}

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

    configProgress: {
      receivedConfigs: new Set<string>(),
      total: TOTAL_CONFIG_COUNT,
    },
    config: data?.config ?? create(Protobuf.LocalOnly.LocalConfigSchema),
    moduleConfig:
      data?.moduleConfig ?? create(Protobuf.LocalOnly.LocalModuleConfigSchema),
    queuedAdminMessages: [],
    hardware: create(Protobuf.Mesh.MyNodeInfoSchema),
    metadata: new Map(),
    pendingSettingsChanges: false,
    clientNotifications: [],

    // Config caching state
    isCachedConfig: false,
    configConflicts: new Map<string, ConfigConflict>(),

    // Remote administration state
    remoteAdminTargetNode: null,
    remoteAdminAuthorized: true, // Local is always authorized
    recentlyConnectedNodes: [],

    setConnectionId: (connectionId: ConnectionId | null) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.device;
          if (device) {
            device.connectionId = connectionId;
          }
        }),
      );
    },
    resetConfigProgress: () => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.device;
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
          const device = draft.device;
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
          const device = draft.device;
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
                device.moduleConfig.remoteHardware =
                  config.payloadVariant.value;
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
    setHardware: (hardware: Protobuf.Mesh.MyNodeInfo) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const newDevice = draft.device;
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
          const device = draft.device;
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
      const device = get().device;
      if (!device?.hardware.myNodeNum) return;

      await channelRepo.upsertChannel({
        ownerNodeNum: device.hardware.myNodeNum,
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
          const device = draft.device;
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
            (waypoint.expire !== 0 && waypoint.expire > Date.now())
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
      const device = get().device;
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
          const device = draft.device;
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
      const device = get().device;
      if (!device) {
        return;
      }

      return device.waypoints.find((waypoint) => waypoint.id === waypointId);
    },
    addMetadata: (from, metadata) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.device;
          if (device) {
            device.metadata.set(from, metadata);
          }
        }),
      );
    },
    addTraceRoute: (traceroute) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.device;
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

    sendAdminMessage(message: Protobuf.Admin.AdminMessage) {
      const device = get().device;
      if (!device) {
        return;
      }

      const destination = device.remoteAdminTargetNode ?? "self";
      device.connection?.sendPacket(
        toBinary(Protobuf.Admin.AdminMessageSchema, message),
        Protobuf.Portnums.PortNum.ADMIN_APP,
        destination,
      );
    },

    addClientNotification: (
      clientNotificationPacket: Protobuf.Mesh.ClientNotification,
    ) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.device;
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
          const device = draft.device;
          if (!device) {
            return;
          }
          device.clientNotifications.splice(index, 1);
        }),
      );
    },
    getClientNotification: (index: number) => {
      const device = get().device;
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
          const device = draft.device;
          if (!device) {
            return;
          }

          // Replace any existing neighbor info for this nodeId
          device.neighborInfo.set(nodeId, neighborInfo);
        }),
      );
    },

    getNeighborInfo: (nodeNum: number) => {
      const device = get().device;
      if (!device) {
        return;
      }
      return device.neighborInfo.get(nodeNum);
    },

    getMyNodeNum: () => {
      const device = get().device;
      return device?.hardware.myNodeNum;
    },

    queueAdminMessage: (message: Protobuf.Admin.AdminMessage) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.device;
          if (!device) {
            return;
          }
          device.queuedAdminMessages.push(message);
        }),
      );
    },

    getAllQueuedAdminMessages: () => {
      const device = get().device;
      if (!device) {
        return [];
      }
      return device.queuedAdminMessages;
    },

    getAdminMessageChangeCount: () => {
      const device = get().device;
      if (!device) {
        return 0;
      }
      return device.queuedAdminMessages.length;
    },

    clearQueuedAdminMessages: () => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.device;
          if (!device) {
            return;
          }
          device.queuedAdminMessages = [];
        }),
      );
    },

    // Config caching methods
    setCachedConfig: (
      config: Protobuf.LocalOnly.LocalConfig,
      moduleConfig: Protobuf.LocalOnly.LocalModuleConfig,
    ) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.device;
          if (device) {
            device.config = config;
            device.moduleConfig = moduleConfig;
            device.isCachedConfig = true;
          }
        }),
      );
    },

    setIsCachedConfig: (isCached: boolean) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.device;
          if (device) {
            device.isCachedConfig = isCached;
          }
        }),
      );
    },

    setConfigConflict: (
      type: "config" | "moduleConfig",
      variant: string,
      conflict: ConfigConflict,
    ) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.device;
          if (device) {
            const key = `${type}:${variant}`;
            device.configConflicts.set(key, conflict);
          }
        }),
      );
    },

    hasAnyConflicts: () => {
      const device = get().device;
      if (!device) {
        return false;
      }
      return device.configConflicts.size > 0;
    },

    getConfigConflict: (type: "config" | "moduleConfig", variant: string) => {
      const device = get().device;
      if (!device) {
        return undefined;
      }
      const key = `${type}:${variant}`;
      return device.configConflicts.get(key);
    },

    clearConfigConflicts: () => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.device;
          if (device) {
            device.configConflicts.clear();
          }
        }),
      );
    },

    // Remote administration methods
    setRemoteAdminTarget: (
      nodeNum: number | null,
      targetPublicKey?: string,
    ) => {
      set(
        produce<PrivateDeviceState>((draft) => {
          const device = draft.device;
          if (device) {
            device.remoteAdminTargetNode = nodeNum;

            // Check authorization only when entering remote admin
            if (nodeNum !== null && targetPublicKey) {
              const adminKeys = device.config.security?.adminKey ?? [];
              const isAuthorized = adminKeys.some((adminKey) => {
                if (!adminKey || adminKey.length === 0) return false;
                try {
                  const targetBytes = toByteArray(targetPublicKey);
                  return (
                    adminKey.length === targetBytes.length &&
                    adminKey.every((b, i) => b === targetBytes[i])
                  );
                } catch {
                  return false;
                }
              });
              device.remoteAdminAuthorized = isAuthorized;
            } else if (nodeNum === null) {
              // Exiting remote admin - reset to authorized (local)
              device.remoteAdminAuthorized = true;
            } else {
              // No public key provided - assume not authorized
              device.remoteAdminAuthorized = false;
            }

            // Add to recently connected if not null and not already in list
            if (
              nodeNum !== null &&
              !device.recentlyConnectedNodes.includes(nodeNum)
            ) {
              device.recentlyConnectedNodes = [
                nodeNum,
                ...device.recentlyConnectedNodes,
              ].slice(0, 10);
            }
          }
        }),
      );
    },

    getAdminDestination: () => {
      const device = get().device;
      return device?.remoteAdminTargetNode ?? "self";
    },
  };
}

export const deviceStoreInitializer: StateCreator<PrivateDeviceState> = (
  set,
  get,
) => ({
  // New single-device API
  device: null,

  initializeDevice: () => {
    const existing = get().device;
    if (existing) {
      return existing;
    }

    // Use a constant ID since we only have one device
    const DEVICE_ID = 1;
    const device = deviceFactory(DEVICE_ID, get, set);
    set(
      produce<PrivateDeviceState>((draft) => {
        draft.device = device;
        // Keep legacy fields in sync during migration
        draft.devices = new Map([[DEVICE_ID, device]]);
        draft.activeDeviceId = DEVICE_ID;
      }),
    );

    return device;
  },

  clearDevice: () => {
    set(
      produce<PrivateDeviceState>((draft) => {
        draft.device = null;
        // Keep legacy fields in sync during migration
        draft.devices = new Map();
        draft.activeDeviceId = 0;
      }),
    );
  },

  setConnection: (connection: MeshDevice) => {
    set(
      produce<PrivateDeviceState>((draft) => {
        if (draft.device) {
          draft.device.connection = connection;
        }
        // Keep legacy fields in sync during migration
        const legacyDevice = draft.devices.get(draft.activeDeviceId);
        if (legacyDevice) {
          legacyDevice.connection = connection;
        }
      }),
    );
  },

  // Legacy fields - kept during migration
  devices: new Map(),
  activeDeviceId: 0,
  activeConnectionId: null,

  addDevice: (id) => {
    const existing = get().device;
    if (existing) {
      return existing;
    }

    const device = deviceFactory(id, get, set);
    set(
      produce<PrivateDeviceState>((draft) => {
        draft.devices = new Map(draft.devices).set(id, device);
        // Keep new API in sync
        draft.device = device;
        draft.activeDeviceId = id;
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
        // Keep new API in sync
        if (draft.activeDeviceId === id) {
          draft.device = null;
          draft.activeDeviceId = 0;
        }
      }),
    );
  },
  getDevices: () => {
    const device = get().device;
    return device ? [device] : [];
  },
  getDevice: (_id) => get().device ?? undefined,

  setActiveDeviceId: (id) => {
    set(
      produce<PrivateDeviceState>((draft) => {
        draft.activeDeviceId = id;
        // Keep new API in sync
        draft.device = draft.device ?? null;
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

/**
 * Device actions for use in services (outside React components).
 * Provides imperative access to device state without using hooks.
 */
export const deviceActions = {
  /** Initialize a new device. Returns the device instance. */
  initializeDevice: () => useDeviceStore.getState().initializeDevice(),

  /** Clear the current device (on disconnect). */
  clearDevice: () => useDeviceStore.getState().clearDevice(),

  /** Get the current device, or null if not connected. */
  getDevice: () => useDeviceStore.getState().device,

  /** Set the MeshDevice connection on the current device. */
  setConnection: (connection: MeshDevice) =>
    useDeviceStore.getState().setConnection(connection),

  /** Set the active connection ID. */
  setActiveConnectionId: (id: ConnectionId | null) =>
    useDeviceStore.getState().setActiveConnectionId(id),

  /** Get the active connection ID. */
  getActiveConnectionId: () => useDeviceStore.getState().activeConnectionId,
};
