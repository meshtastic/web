import { create, toBinary } from "@bufbuild/protobuf";
import { type MeshDevice, Protobuf, Types } from "@meshtastic/core";
import { produce } from "immer";
import { createContext, useContext } from "react";
import { create as createStore } from "zustand";

export type Page = "messages" | "map" | "config" | "channels" | "nodes";

export interface ProcessPacketParams {
  from: number;
  snr: number;
  time: number;
}

export type DialogVariant = keyof Device["dialog"];

type NodeError = {
  node: number;
  error: string;
};
export type ValidConfigType = Exclude<
  Protobuf.Config.Config["payloadVariant"]["case"],
  "deviceUi" | "sessionkey" | undefined
>;
export type ValidModuleConfigType = Exclude<
  Protobuf.ModuleConfig.ModuleConfig["payloadVariant"]["case"],
  undefined
>;

export interface Device {
  id: number;
  status: Types.DeviceStatusEnum;
  channels: Map<Types.ChannelNumber, Protobuf.Channel.Channel>;
  config: Protobuf.LocalOnly.LocalConfig;
  moduleConfig: Protobuf.LocalOnly.LocalModuleConfig;
  workingConfig: Protobuf.Config.Config[];
  workingModuleConfig: Protobuf.ModuleConfig.ModuleConfig[];
  hardware: Protobuf.Mesh.MyNodeInfo;
  metadata: Map<number, Protobuf.Mesh.DeviceMetadata>;
  traceroutes: Map<
    number,
    Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>[]
  >;
  nodeErrors: Map<number, NodeError>;
  connection?: MeshDevice;
  activeNode: number;
  waypoints: Protobuf.Mesh.Waypoint[];
  pendingSettingsChanges: boolean;
  messageDraft: string;
  unreadCounts: Map<number, number>;
  nodesMap: Map<number, Protobuf.Mesh.NodeInfo>; // dont access directly, use getNodes, or getNode
  dialog: {
    import: boolean;
    QR: boolean;
    shutdown: boolean;
    reboot: boolean;
    deviceName: boolean;
    nodeRemoval: boolean;
    pkiBackup: boolean;
    nodeDetails: boolean;
    unsafeRoles: boolean;
    refreshKeys: boolean;
    deleteMessages: boolean;
    managedMode: boolean;
    clientNotification: boolean;
  };
  clientNotifications: Protobuf.Mesh.ClientNotification[];

  setStatus: (status: Types.DeviceStatusEnum) => void;
  setConfig: (config: Protobuf.Config.Config) => void;
  setModuleConfig: (config: Protobuf.ModuleConfig.ModuleConfig) => void;
  setWorkingConfig: (config: Protobuf.Config.Config) => void;
  setWorkingModuleConfig: (config: Protobuf.ModuleConfig.ModuleConfig) => void;
  getWorkingConfig: (
    payloadVariant: ValidConfigType,
  ) =>
    | Protobuf.LocalOnly.LocalConfig[Exclude<ValidConfigType, undefined>]
    | undefined;
  getWorkingModuleConfig: (
    payloadVariant: ValidModuleConfigType,
  ) =>
    | Protobuf.LocalOnly.LocalModuleConfig[Exclude<
        ValidModuleConfigType,
        undefined
      >]
    | undefined;
  removeWorkingConfig: (payloadVariant?: ValidConfigType) => void;
  removeWorkingModuleConfig: (payloadVariant?: ValidModuleConfigType) => void;
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
  addWaypoint: (waypoint: Protobuf.Mesh.Waypoint) => void;
  addNodeInfo: (nodeInfo: Protobuf.Mesh.NodeInfo) => void;
  addUser: (user: Types.PacketMetadata<Protobuf.Mesh.User>) => void;
  addPosition: (position: Types.PacketMetadata<Protobuf.Mesh.Position>) => void;
  addConnection: (connection: MeshDevice) => void;
  addTraceRoute: (
    traceroute: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>,
  ) => void;
  addMetadata: (from: number, metadata: Protobuf.Mesh.DeviceMetadata) => void;
  removeNode: (nodeNum: number) => void;
  setDialogOpen: (dialog: DialogVariant, open: boolean) => void;
  getDialogOpen: (dialog: DialogVariant) => boolean;
  processPacket: (data: ProcessPacketParams) => void;
  setMessageDraft: (message: string) => void;
  setNodeError: (nodeNum: number, error: string) => void;
  clearNodeError: (nodeNum: number) => void;
  getNodeError: (nodeNum: number) => NodeError | undefined;
  hasNodeError: (nodeNum: number) => boolean;
  incrementUnread: (nodeNum: number) => void;
  resetUnread: (nodeNum: number) => void;
  getUnreadCount: (nodeNum: number) => number;
  getAllUnreadCount: () => number;
  getNodes: (
    filter?: (node: Protobuf.Mesh.NodeInfo) => boolean,
  ) => Protobuf.Mesh.NodeInfo[];
  getNodesLength: () => number;
  getNode: (nodeNum: number) => Protobuf.Mesh.NodeInfo | undefined;
  getMyNode: () => Protobuf.Mesh.NodeInfo;
  sendAdminMessage: (message: Protobuf.Admin.AdminMessage) => void;
  updateFavorite: (nodeNum: number, isFavorite: boolean) => void;
  updateIgnored: (nodeNum: number, isIgnored: boolean) => void;
  addClientNotification: (
    clientNotificationPacket: Protobuf.Mesh.ClientNotification,
  ) => void;
  removeClientNotification: (index: number) => void;
  getClientNotification: (
    index: number,
  ) => Protobuf.Mesh.ClientNotification | undefined;
}

export interface DeviceState {
  addDevice: (id: number) => Device;
  removeDevice: (id: number) => void;
  getDevices: () => Device[];
  getDevice: (id: number) => Device | undefined;
}

interface PrivateDeviceState extends DeviceState {
  devices: Map<number, Device>;
  remoteDevices: Map<number, undefined>;
}

export const useDeviceStore = createStore<PrivateDeviceState>((set, get) => ({
  devices: new Map(),
  remoteDevices: new Map(),

  addDevice: (id: number) => {
    set(
      produce<PrivateDeviceState>((draft) => {
        draft.devices.set(id, {
          id,
          status: Types.DeviceStatusEnum.DeviceDisconnected,
          channels: new Map(),
          config: create(Protobuf.LocalOnly.LocalConfigSchema),
          moduleConfig: create(Protobuf.LocalOnly.LocalModuleConfigSchema),
          workingConfig: [],
          workingModuleConfig: [],
          hardware: create(Protobuf.Mesh.MyNodeInfoSchema),
          metadata: new Map(),
          traceroutes: new Map(),
          connection: undefined,
          activeNode: 0,
          waypoints: [],
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
          },
          pendingSettingsChanges: false,
          messageDraft: "",
          nodeErrors: new Map(),
          unreadCounts: new Map(),
          nodesMap: new Map(),
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
                      device.moduleConfig.storeForward =
                        config.payloadVariant.value;
                      break;
                    }
                    case "rangeTest": {
                      device.moduleConfig.rangeTest =
                        config.payloadVariant.value;
                      break;
                    }
                    case "telemetry": {
                      device.moduleConfig.telemetry =
                        config.payloadVariant.value;
                      break;
                    }
                    case "cannedMessage": {
                      device.moduleConfig.cannedMessage =
                        config.payloadVariant.value;
                      break;
                    }
                    case "audio": {
                      device.moduleConfig.audio = config.payloadVariant.value;
                      break;
                    }
                    case "neighborInfo": {
                      device.moduleConfig.neighborInfo =
                        config.payloadVariant.value;
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
                      device.moduleConfig.paxcounter =
                        config.payloadVariant.value;
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
                    wmc.payloadVariant.case ===
                    moduleConfig.payloadVariant.case,
                );

                if (index !== -1) {
                  device.workingModuleConfig[index] = moduleConfig;
                } else {
                  device.workingModuleConfig.push(moduleConfig);
                }
              }),
            );
          },

          getWorkingConfig: (payloadVariant: ValidConfigType) => {
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

            return workingConfig?.payloadVariant.value;
          },
          getWorkingModuleConfig: (payloadVariant: ValidModuleConfigType) => {
            const device = get().devices.get(id);
            if (!device) {
              return;
            }

            return device.workingModuleConfig.find(
              (c) => c.payloadVariant.case === payloadVariant,
            )?.payloadVariant.value;
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
          removeWorkingModuleConfig: (
            payloadVariant?: ValidModuleConfigType,
          ) => {
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

          setHardware: (hardware: Protobuf.Mesh.MyNodeInfo) => {
            set(
              produce<PrivateDeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.hardware = hardware;
                }
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
          addWaypoint: (waypoint: Protobuf.Mesh.Waypoint) => {
            set(
              produce<PrivateDeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  const index = device.waypoints.findIndex(
                    (wp) => wp.id === waypoint.id,
                  );
                  if (index !== -1) {
                    device.waypoints[index] = waypoint;
                  } else {
                    device.waypoints.push(waypoint);
                  }
                }
              }),
            );
          },
          addNodeInfo: (nodeInfo) => {
            set(
              produce<PrivateDeviceState>((draft) => {
                const device = draft.devices.get(id);

                if (!device) {
                  return;
                }
                device.nodesMap.set(nodeInfo.num, nodeInfo);
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
          addUser: (user) => {
            set(
              produce<PrivateDeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }
                const currentNode =
                  device.nodesMap.get(user.from) ??
                  create(Protobuf.Mesh.NodeInfoSchema);
                currentNode.user = user.data;
                currentNode.num = user.from;
                device.nodesMap.set(user.from, currentNode);
              }),
            );
          },
          addPosition: (position) => {
            set(
              produce<PrivateDeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }
                const currentNode =
                  device.nodesMap.get(position.from) ??
                  create(Protobuf.Mesh.NodeInfoSchema);
                currentNode.position = position.data;
                currentNode.num = position.from;
                device.nodesMap.set(position.from, currentNode);
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
              }),
            );
          },
          removeNode: (nodeNum: number) => {
            set(
              produce<PrivateDeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }
                device.nodesMap.delete(nodeNum);
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
          processPacket(data: ProcessPacketParams) {
            set(
              produce<PrivateDeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }
                const node = device.nodesMap.get(data.from);
                if (node) {
                  node.lastHeard = data.time;
                  node.snr = data.snr;
                  device.nodesMap.set(data.from, node);
                } else {
                  device.nodesMap.set(
                    data.from,
                    create(Protobuf.Mesh.NodeInfoSchema, {
                      num: data.from,
                      lastHeard: data.time,
                      snr: data.snr,
                    }),
                  );
                }
              }),
            );
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
          setNodeError: (nodeNum: number, error: string) => {
            set(
              produce<PrivateDeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.nodeErrors.set(nodeNum, { node: nodeNum, error });
                }
              }),
            );
          },
          clearNodeError: (nodeNum: number) => {
            set(
              produce<PrivateDeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.nodeErrors.delete(nodeNum);
                }
              }),
            );
          },
          getNodeError: (nodeNum: number) => {
            const device = get().devices.get(id);
            if (!device) {
              throw new Error(`Device ${id} not found`);
            }
            return device.nodeErrors.get(nodeNum);
          },
          hasNodeError: (nodeNum: number) => {
            const device = get().devices.get(id);
            if (!device) {
              throw new Error(`Device ${id} not found`);
            }
            return device.nodeErrors.has(nodeNum);
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
          getNodes: (
            filter?: (node: Protobuf.Mesh.NodeInfo) => boolean,
          ): Protobuf.Mesh.NodeInfo[] => {
            const device = get().devices.get(id);
            if (!device) {
              return [];
            }
            const allNodes = Array.from(device.nodesMap.values()).filter(
              (node) => node.num !== get().devices.get(id)?.hardware.myNodeNum,
            );
            if (filter) {
              return allNodes.filter(filter);
            }
            return allNodes;
          },
          getNode: (nodeNum: number): Protobuf.Mesh.NodeInfo | undefined => {
            const device = get().devices.get(id);
            if (!device) {
              return;
            }
            if (!device.nodesMap.has(nodeNum)) {
              return undefined;
            }
            return device.nodesMap.get(nodeNum);
          },
          getMyNode: (): Protobuf.Mesh.NodeInfo => {
            const device = get().devices.get(id);
            if (!device) {
              throw new Error(`Device ${id} not found`);
            }
            return (
              device.nodesMap.get(device.hardware.myNodeNum) ??
              create(Protobuf.Mesh.NodeInfoSchema)
            );
          },
          getNodesLength: () => {
            const device = get().devices.get(id);
            if (!device) {
              return 0;
            }
            return device.nodesMap.size;
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

          updateFavorite(nodeNum: number, isFavorite: boolean) {
            const device = get().devices.get(id);
            if (!device) {
              return;
            }
            const node = device?.nodesMap.get(nodeNum);
            if (!node) {
              return;
            }

            device.sendAdminMessage(
              create(Protobuf.Admin.AdminMessageSchema, {
                payloadVariant: {
                  case: isFavorite ? "setFavoriteNode" : "removeFavoriteNode",
                  value: nodeNum,
                },
              }),
            );

            set(
              produce<PrivateDeviceState>((draft) => {
                const device = draft.devices.get(id);
                const node = device?.nodesMap.get(nodeNum);
                if (node) {
                  node.isFavorite = isFavorite;
                }
              }),
            );
          },
          updateIgnored(nodeNum: number, isIgnored: boolean) {
            const device = get().devices.get(id);
            if (!device) {
              return;
            }
            const node = device?.nodesMap.get(nodeNum);
            if (!node) {
              return;
            }

            device.sendAdminMessage(
              create(Protobuf.Admin.AdminMessageSchema, {
                payloadVariant: {
                  case: isIgnored ? "setIgnoredNode" : "removeIgnoredNode",
                  value: nodeNum,
                },
              }),
            );

            set(
              produce<PrivateDeviceState>((draft) => {
                const device = draft.devices.get(id);
                const node = device?.nodesMap.get(nodeNum);
                if (node) {
                  node.isIgnored = isIgnored;
                }
              }),
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
        });
      }),
    );

    const device = get().devices.get(id);
    if (!device) {
      throw new Error(`Failed to create or retrieve device with ID ${id}`);
    }
    return device;
  },

  removeDevice: (id) => {
    set(
      produce<PrivateDeviceState>((draft) => {
        draft.devices.delete(id);
      }),
    );
  },

  getDevices: () => Array.from(get().devices.values()),

  getDevice: (id) => get().devices.get(id),
}));

export const DeviceContext = createContext<Device | undefined>(undefined);

export const useDevice = (): Device => {
  const context = useContext(DeviceContext);
  if (context === undefined) {
    throw new Error("useDevice must be used within a DeviceProvider");
  }
  return context;
};
