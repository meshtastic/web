import { create } from "@bufbuild/protobuf";
import { MeshDevice, Protobuf, Types } from "@meshtastic/core";
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
  activePage: Page;
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
    rebootOTA: boolean;
    deviceName: boolean;
    nodeRemoval: boolean;
    pkiBackup: boolean;
    nodeDetails: boolean;
    unsafeRoles: boolean;
    refreshKeys: boolean;
    deleteMessages: boolean;
  };

  setStatus: (status: Types.DeviceStatusEnum) => void;
  setConfig: (config: Protobuf.Config.Config) => void;
  setModuleConfig: (config: Protobuf.ModuleConfig.ModuleConfig) => void;
  setWorkingConfig: (config: Protobuf.Config.Config) => void;
  setWorkingModuleConfig: (config: Protobuf.ModuleConfig.ModuleConfig) => void;
  setHardware: (hardware: Protobuf.Mesh.MyNodeInfo) => void;
  setActivePage: (page: Page) => void;
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
  getNodes: (
    filter?: (node: Protobuf.Mesh.NodeInfo) => boolean,
  ) => Protobuf.Mesh.NodeInfo[];
  getNodesLength: () => number;
  getNode: (nodeNum: number) => Protobuf.Mesh.NodeInfo | undefined;
  getMyNode: () => Protobuf.Mesh.NodeInfo;
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
      produce<DeviceState>((draft) => {
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
          activePage: "messages",
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
            rebootOTA: false,
            deleteMessages: false,
          },
          pendingSettingsChanges: false,
          messageDraft: "",
          nodeErrors: new Map(),
          unreadCounts: new Map(),
          nodesMap: new Map(),

          setStatus: (status: Types.DeviceStatusEnum) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.status = status;
                }
              }),
            );
          },
          setConfig: (config: Protobuf.Config.Config) => {
            set(
              produce<DeviceState>((draft) => {
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
              produce<DeviceState>((draft) => {
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
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) return;
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
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) return;
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
          setHardware: (hardware: Protobuf.Mesh.MyNodeInfo) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.hardware = hardware;
                }
              }),
            );
          },
          setActivePage: (page) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.activePage = page;
                }
              }),
            );
          },
          setPendingSettingsChanges: (state) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.pendingSettingsChanges = state;
                }
              }),
            );
          },
          addChannel: (channel: Protobuf.Channel.Channel) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.channels.set(channel.index, channel);
                }
              }),
            );
          },
          addWaypoint: (waypoint: Protobuf.Mesh.Waypoint) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  const index = device.waypoints.findIndex((wp) =>
                    wp.id === waypoint.id
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
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);

                if (!device) return;
                device.nodesMap.set(nodeInfo.num, nodeInfo);
              }),
            );
          },
          setActiveNode: (node) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.activeNode = node;
                }
              }),
            );
          },
          addUser: (user) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }
                const currentNode = device.nodesMap.get(user.from) ??
                  create(Protobuf.Mesh.NodeInfoSchema);
                currentNode.user = user.data;
                currentNode.num = user.from;
                device.nodesMap.set(user.from, currentNode);
              }),
            );
          },
          addPosition: (position) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }
                const currentNode = device.nodesMap.get(position.from) ??
                  create(Protobuf.Mesh.NodeInfoSchema);
                currentNode.position = position.data;
                currentNode.num = position.from;
                device.nodesMap.set(position.from, currentNode);
              }),
            );
          },
          addConnection: (connection) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.connection = connection;
                }
              }),
            );
          },
          addMetadata: (from, metadata) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.metadata.set(from, metadata);
                }
              }),
            );
          },
          addTraceRoute: (traceroute) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) return;
                const routes = device.traceroutes.get(traceroute.from) ?? [];
                routes.push(traceroute);
                device.traceroutes.set(traceroute.from, routes);
              }),
            );
          },
          removeNode: (nodeNum) => {
            set(
              produce<DeviceState>((draft) => {
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
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.dialog[dialog] = open;
                }
              }),
            );
          },
          getDialogOpen: (dialog: DialogVariant) => {
            const device = get().devices.get(id);
            if (!device) throw new Error(`Device ${id} not found`);
            return device.dialog[dialog];
          },
          processPacket(data: ProcessPacketParams) {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) return;
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
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.messageDraft = message;
                }
              }),
            );
          },
          setNodeError: (nodeNum, error) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.nodeErrors.set(nodeNum, { node: nodeNum, error });
                }
              }),
            );
          },
          clearNodeError: (nodeNum: number) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.nodeErrors.delete(nodeNum);
                }
              }),
            );
          },
          getNodeError: (nodeNum: number) => {
            const device = get().devices.get(id);
            if (!device) throw new Error(`Device ${id} not found`);
            return device.nodeErrors.get(nodeNum);
          },
          hasNodeError: (nodeNum: number) => {
            const device = get().devices.get(id);
            if (!device) throw new Error(`Device ${id} not found`);
            return device.nodeErrors.has(nodeNum);
          },
          incrementUnread: (nodeNum: number) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) return;
                const currentCount = device.unreadCounts.get(nodeNum) ?? 0;
                device.unreadCounts.set(nodeNum, currentCount + 1);
              }),
            );
          },
          resetUnread: (nodeNum: number) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) return;
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
            return device.nodesMap.get(device.hardware.myNodeNum) ??
              create(Protobuf.Mesh.NodeInfoSchema);
          },
          getNodesLength: () => {
            const device = get().devices.get(id);
            if (!device) {
              return 0;
            }
            return device.nodesMap.size;
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
      produce<DeviceState>((draft) => {
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
