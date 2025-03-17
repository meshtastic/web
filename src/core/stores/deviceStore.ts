import { create } from "@bufbuild/protobuf";
import { MeshDevice, Protobuf, Types } from "@meshtastic/core";
import { produce } from "immer";
import { createContext, useContext } from "react";
import { create as createStore } from "zustand";

export type Page = "messages" | "map" | "config" | "channels" | "nodes";

export interface MessageWithState extends Types.PacketMetadata<string> {
  state: MessageState;
}

export type MessageState = "ack" | "waiting" | Protobuf.Mesh.Routing_Error;

export interface ProcessPacketParams {
  from: number;
  snr: number;
  time: number;
}

export type DialogVariant =
  | "import"
  | "QR"
  | "shutdown"
  | "reboot"
  | "deviceName"
  | "nodeRemoval"
  | "pkiBackup"
  | "nodeDetails"
  | "unsafeRoles"
  | "refreshKeys";

type QueueStatus = {
  res: number, free: number, maxlen: number
}

type NodeError = {
  node: number;
  error: string;
}

export interface Device {
  id: number;
  status: Types.DeviceStatusEnum;
  channels: Map<Types.ChannelNumber, Protobuf.Channel.Channel>;
  config: Protobuf.LocalOnly.LocalConfig;
  moduleConfig: Protobuf.LocalOnly.LocalModuleConfig;
  workingConfig: Protobuf.Config.Config[];
  workingModuleConfig: Protobuf.ModuleConfig.ModuleConfig[];
  hardware: Protobuf.Mesh.MyNodeInfo;
  nodes: Map<number, Protobuf.Mesh.NodeInfo>;
  metadata: Map<number, Protobuf.Mesh.DeviceMetadata>;
  messages: {
    direct: Map<number, MessageWithState[]>;
    broadcast: Map<Types.ChannelNumber, MessageWithState[]>;
  };
  traceroutes: Map<
    number,
    Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>[]
  >;
  nodeErrors: Map<number, NodeError>;
  connection?: MeshDevice;
  activePage: Page;
  activeNode: number;
  waypoints: Protobuf.Mesh.Waypoint[];
  // currentMetrics: Protobuf.DeviceMetrics;
  pendingSettingsChanges: boolean;
  messageDraft: string;
  queueStatus: QueueStatus,
  isQueueingMessages: boolean,
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
  };


  setStatus: (status: Types.DeviceStatusEnum) => void;
  setConfig: (config: Protobuf.Config.Config) => void;
  setModuleConfig: (config: Protobuf.ModuleConfig.ModuleConfig) => void;
  setWorkingConfig: (config: Protobuf.Config.Config) => void;
  setWorkingModuleConfig: (config: Protobuf.ModuleConfig.ModuleConfig) => void;
  setHardware: (hardware: Protobuf.Mesh.MyNodeInfo) => void;
  // setMetrics: (metrics: Types.PacketMetadata<Protobuf.Telemetry>) => void;
  setActivePage: (page: Page) => void;
  setActiveNode: (node: number) => void;
  setPendingSettingsChanges: (state: boolean) => void;
  addChannel: (channel: Protobuf.Channel.Channel) => void;
  addWaypoint: (waypoint: Protobuf.Mesh.Waypoint) => void;
  addNodeInfo: (nodeInfo: Protobuf.Mesh.NodeInfo) => void;
  addUser: (user: Types.PacketMetadata<Protobuf.Mesh.User>) => void;
  addPosition: (position: Types.PacketMetadata<Protobuf.Mesh.Position>) => void;
  addConnection: (connection: MeshDevice) => void;
  addMessage: (message: MessageWithState) => void;
  addTraceRoute: (
    traceroute: Types.PacketMetadata<Protobuf.Mesh.RouteDiscovery>,
  ) => void;
  addMetadata: (from: number, metadata: Protobuf.Mesh.DeviceMetadata) => void;
  removeNode: (nodeNum: number) => void;
  setMessageState: (
    type: "direct" | "broadcast",
    channelIndex: Types.ChannelNumber,
    to: number,
    from: number,
    messageId: number,
    state: MessageState,
  ) => void;
  setDialogOpen: (dialog: DialogVariant, open: boolean) => void;
  getDialogOpen: (dialog: DialogVariant) => boolean;
  processPacket: (data: ProcessPacketParams) => void;
  setMessageDraft: (message: string) => void;
  setQueueStatus: (status: QueueStatus) => void;
  setNodeError: (nodeNum: number, error: string) => void;
  clearNodeError: (nodeNum: number) => void;
  getNodeError: (nodeNum: number) => NodeError | undefined;
  hasNodeError: (nodeNum: number) => boolean
}

export interface DeviceState {
  devices: Map<number, Device>;
  remoteDevices: Map<number, undefined>;

  addDevice: (id: number) => Device;
  removeDevice: (id: number) => void;
  getDevices: () => Device[];
  getDevice: (id: number) => Device | undefined;
}

export const useDeviceStore = createStore<DeviceState>((set, get) => ({
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
          nodes: new Map(),
          metadata: new Map(),
          messages: {
            direct: new Map(),
            broadcast: new Map(),
          },
          traceroutes: new Map(),
          connection: undefined,
          activePage: "messages",
          activeNode: 0,
          waypoints: [],
          queueStatus: {
            res: 0, free: 0, maxlen: 0
          },
          isQueueingMessages: false,
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
          },
          pendingSettingsChanges: false,
          messageDraft: "",
          nodeErrors: new Map(),


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
                if (!device) {
                  return;
                }
                const workingConfigIndex = device?.workingConfig.findIndex(
                  (wc) => wc.payloadVariant.case === config.payloadVariant.case,
                );
                if (workingConfigIndex !== -1) {
                  device.workingConfig[workingConfigIndex] = config;
                } else {
                  device?.workingConfig.push(config);
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
                if (!device) {
                  return;
                }
                const workingModuleConfigIndex = device?.workingModuleConfig
                  .findIndex(
                    (wmc) =>
                      wmc.payloadVariant.case ===
                      moduleConfig.payloadVariant.case,
                  );
                if (workingModuleConfigIndex !== -1) {
                  device.workingModuleConfig[workingModuleConfigIndex] =
                    moduleConfig;
                } else {
                  device?.workingModuleConfig.push(moduleConfig);
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
          // setMetrics: (metrics: Types.PacketMetadata<Protobuf.Telemetry>) => {
          //   set(
          //     produce<DeviceState>((draft) => {
          //       const device = draft.devices.get(id);
          //       let node = device?.nodes.find(
          //         (n) => n.data.num === metrics.from
          //       );
          //       if (node) {
          //         switch (metrics.data.variant.case) {
          //           case "deviceMetrics":
          //             if (device) {
          //               if (metrics.data.variant.value.batteryLevel) {
          //                 device.currentMetrics.batteryLevel =
          //                   metrics.data.variant.value.batteryLevel;
          //               }
          //               if (metrics.data.variant.value.voltage) {
          //                 device.currentMetrics.voltage =
          //                   metrics.data.variant.value.voltage;
          //               }
          //               if (metrics.data.variant.value.airUtilTx) {
          //                 device.currentMetrics.airUtilTx =
          //                   metrics.data.variant.value.airUtilTx;
          //               }
          //               if (metrics.data.variant.value.channelUtilization) {
          //                 device.currentMetrics.channelUtilization =
          //                   metrics.data.variant.value.channelUtilization;
          //               }
          //             }
          //             node.deviceMetrics.push({
          //               metric: metrics.data.variant.value,
          //               timestamp: metrics.rxTime
          //             });
          //             break;
          //           case "environmentMetrics":
          //             node.environmentMetrics.push({
          //               metric: metrics.data.variant.value,
          //               timestamp: metrics.rxTime
          //             });
          //             break;
          //         }
          //       }
          //     })
          //   );
          // },
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
                if (!device) {
                  return;
                }
                device.channels.set(channel.index, channel);
              }),
            );
          },
          addWaypoint: (waypoint: Protobuf.Mesh.Waypoint) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  const waypointIndex = device.waypoints.findIndex(
                    (wp) => wp.id === waypoint.id,
                  );

                  if (waypointIndex !== -1) {
                    device.waypoints[waypointIndex] = waypoint;
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
                if (!device) {
                  return;
                }
                device.nodes.set(nodeInfo.num, nodeInfo);
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
                const currentNode = device.nodes.get(user.from) ??
                  create(Protobuf.Mesh.NodeInfoSchema);
                currentNode.user = user.data;
                device.nodes.set(user.from, currentNode);
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
                const currentNode = device.nodes.get(position.from) ??
                  create(Protobuf.Mesh.NodeInfoSchema);
                currentNode.position = position.data;
                device.nodes.set(position.from, currentNode);
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
          addMessage: (message) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }
                const messageGroup = device.messages[message.type];
                const messageIndex = message.type === "direct"
                  ? message.from === device.hardware.myNodeNum
                    ? message.to
                    : message.from
                  : message.channel;
                const messages = messageGroup.get(messageIndex);

                if (messages) {
                  messages.push(message);
                  messageGroup.set(messageIndex, messages);
                } else {
                  messageGroup.set(messageIndex, [message]);
                }
              }),
            );
          },

          addMetadata: (from, metadata) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }
                device.metadata.set(from, metadata);
              }),
            );
          },
          addTraceRoute: (traceroute) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }

                const nodetraceroutes = device.traceroutes.get(traceroute.from);
                if (nodetraceroutes) {
                  nodetraceroutes.push(traceroute);
                  device.traceroutes.set(traceroute.from, nodetraceroutes);
                } else {
                  device.traceroutes.set(traceroute.from, [traceroute]);
                }
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
                device.nodes.delete(nodeNum);
              }),
            );
          },
          setMessageState: (
            type: "direct" | "broadcast",
            channelIndex: Types.ChannelNumber,
            to: number,
            from: number,
            messageId: number,
            state: MessageState,
          ) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }
                const messageGroup = device.messages[type];

                const messageIndex = type === "direct"
                  ? from === device.hardware.myNodeNum ? to : from
                  : channelIndex;
                const messages = messageGroup.get(messageIndex);

                if (!messages) {
                  return;
                }

                messageGroup.set(
                  messageIndex,
                  messages.map((msg) => {
                    if (msg.id === messageId) {
                      msg.state = state;
                    }
                    return msg;
                  }),
                );
              }),
            );
          },
          setDialogOpen: (dialog: DialogVariant, open: boolean) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }
                device.dialog[dialog] = open;
              }),
            );
          },
          getDialogOpen: (dialog: DialogVariant) => {
            const device = get().devices.get(id);
            if (!device) {
              throw new Error("Device not found");
            }
            return device.dialog[dialog];
          },
          processPacket(data: ProcessPacketParams) {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }
                const node = device.nodes.get(data.from);
                if (node) {
                  device.nodes.set(data.from, {
                    ...node,
                    lastHeard: data.time,
                    snr: data.snr,
                  });
                } else {
                  device.nodes.set(
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
          setQueueStatus: (status: QueueStatus) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.queueStatus = status;
                  device.queueStatus.free >= 10 ? true : false
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
            if (!device) {
              throw new Error("Device not found");
            }
            return device.nodeErrors.get(nodeNum);
          },
          hasNodeError: (nodeNum: number) => {
            const device = get().devices.get(id);
            if (!device) {
              throw new Error("Device not found");
            }
            return device.nodeErrors.has(nodeNum);
          },

        });
      }),
    );

    const device = get().devices.get(id);

    if (!device) {
      throw new Error("Device not found");
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
