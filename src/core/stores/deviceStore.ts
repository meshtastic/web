import { createContext, useContext } from "react";

import { produce } from "immer";
import { create } from "zustand";

import { Protobuf, Types } from "@meshtastic/meshtasticjs";
import { channel } from "diagnostics_channel";

export type Page = "messages" | "map" | "config" | "channels" | "peers";

export interface MessageWithState extends Types.PacketMetadata<string> {
  state: MessageState;
}

export type MessageState = "ack" | "waiting" | Protobuf.Routing_Error;

export interface processPacketParams {
  from: number;
  snr: number;
  time: number;
}

export type DialogVariant =
  | "import"
  | "QR"
  | "shutdown"
  | "reboot"
  | "deviceName";

export interface Device {
  id: number;
  status: Types.DeviceStatusEnum;
  channels: Map<Types.ChannelNumber, Protobuf.Channel>;
  config: Protobuf.LocalConfig;
  moduleConfig: Protobuf.LocalModuleConfig;
  workingConfig: Protobuf.Config[];
  workingModuleConfig: Protobuf.ModuleConfig[];
  hardware: Protobuf.MyNodeInfo;
  nodes: Map<number, Protobuf.NodeInfo>;
  metadata: Map<number, Protobuf.DeviceMetadata>;
  messages: {
    direct: Map<number, MessageWithState[]>;
    broadcast: Map<Types.ChannelNumber, MessageWithState[]>;
  };
  connection?: Types.ConnectionType;
  activePage: Page;
  activePeer: number;
  waypoints: Protobuf.Waypoint[];
  // currentMetrics: Protobuf.DeviceMetrics;
  pendingSettingsChanges: boolean;
  messageDraft: string;
  dialog: {
    import: boolean;
    QR: boolean;
    shutdown: boolean;
    reboot: boolean;
    deviceName: boolean;
  };

  setStatus: (status: Types.DeviceStatusEnum) => void;
  setConfig: (config: Protobuf.Config) => void;
  setModuleConfig: (config: Protobuf.ModuleConfig) => void;
  setWorkingConfig: (config: Protobuf.Config) => void;
  setWorkingModuleConfig: (config: Protobuf.ModuleConfig) => void;
  setHardware: (hardware: Protobuf.MyNodeInfo) => void;
  // setMetrics: (metrics: Types.PacketMetadata<Protobuf.Telemetry>) => void;
  setActivePage: (page: Page) => void;
  setActivePeer: (peer: number) => void;
  setPendingSettingsChanges: (state: boolean) => void;
  addChannel: (channel: Protobuf.Channel) => void;
  addWaypoint: (waypoint: Protobuf.Waypoint) => void;
  addNodeInfo: (nodeInfo: Protobuf.NodeInfo) => void;
  addUser: (user: Types.PacketMetadata<Protobuf.User>) => void;
  addPosition: (position: Types.PacketMetadata<Protobuf.Position>) => void;
  addConnection: (connection: Types.ConnectionType) => void;
  addMessage: (message: MessageWithState) => void;
  addMetadata: (from: number, metadata: Protobuf.DeviceMetadata) => void;
  setMessageState: (
    type: "direct" | "broadcast",
    channelIndex: Types.ChannelNumber,
    to: number,
    from: number,
    messageId: number,
    state: MessageState,
  ) => void;
  setDialogOpen: (dialog: DialogVariant, open: boolean) => void;
  processPacket: (data: processPacketParams) => void;
  setMessageDraft: (message: string) => void;
}

export interface DeviceState {
  devices: Map<number, Device>;
  remoteDevices: Map<number, undefined>;

  addDevice: (id: number) => Device;
  removeDevice: (id: number) => void;
  getDevices: () => Device[];
  getDevice: (id: number) => Device | undefined;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: new Map(),
  remoteDevices: new Map(),

  addDevice: (id: number) => {
    set(
      produce<DeviceState>((draft) => {
        draft.devices.set(id, {
          id,
          status: Types.DeviceStatusEnum.DEVICE_DISCONNECTED,
          channels: new Map(),
          config: new Protobuf.LocalConfig(),
          moduleConfig: new Protobuf.LocalModuleConfig(),
          workingConfig: [],
          workingModuleConfig: [],
          hardware: new Protobuf.MyNodeInfo(),
          nodes: new Map(),
          metadata: new Map(),
          messages: {
            direct: new Map(),
            broadcast: new Map(),
          },
          connection: undefined,
          activePage: "messages",
          activePeer: 0,
          waypoints: [],
          // currentMetrics: new Protobuf.DeviceMetrics(),
          dialog: {
            import: false,
            QR: false,
            shutdown: false,
            reboot: false,
            deviceName: false,
          },
          pendingSettingsChanges: false,
          messageDraft: "",

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
          setConfig: (config: Protobuf.Config) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);

                if (device) {
                  switch (config.payloadVariant.case) {
                    case "device":
                      device.config.device = config.payloadVariant.value;
                      break;
                    case "position":
                      device.config.position = config.payloadVariant.value;
                      break;
                    case "power":
                      device.config.power = config.payloadVariant.value;
                      break;
                    case "network":
                      device.config.network = config.payloadVariant.value;
                      break;
                    case "display":
                      device.config.display = config.payloadVariant.value;
                      break;
                    case "lora":
                      device.config.lora = config.payloadVariant.value;
                      break;
                    case "bluetooth":
                      device.config.bluetooth = config.payloadVariant.value;
                      break;
                  }
                }
              }),
            );
          },
          setModuleConfig: (config: Protobuf.ModuleConfig) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);

                if (device) {
                  switch (config.payloadVariant.case) {
                    case "mqtt":
                      device.moduleConfig.mqtt = config.payloadVariant.value;
                      break;
                    case "serial":
                      device.moduleConfig.serial = config.payloadVariant.value;
                      break;
                    case "externalNotification":
                      device.moduleConfig.externalNotification =
                        config.payloadVariant.value;
                      break;
                    case "storeForward":
                      device.moduleConfig.storeForward =
                        config.payloadVariant.value;
                      break;
                    case "rangeTest":
                      device.moduleConfig.rangeTest =
                        config.payloadVariant.value;
                      break;
                    case "telemetry":
                      device.moduleConfig.telemetry =
                        config.payloadVariant.value;
                      break;
                    case "cannedMessage":
                      device.moduleConfig.cannedMessage =
                        config.payloadVariant.value;
                      break;
                    case "audio":
                      device.moduleConfig.audio = config.payloadVariant.value;
                  }
                }
              }),
            );
          },
          setWorkingConfig: (config: Protobuf.Config) => {
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
          setWorkingModuleConfig: (moduleConfig: Protobuf.ModuleConfig) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }
                const workingModuleConfigIndex =
                  device?.workingModuleConfig.findIndex(
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
          setHardware: (hardware: Protobuf.MyNodeInfo) => {
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
          addChannel: (channel: Protobuf.Channel) => {
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
          addWaypoint: (waypoint: Protobuf.Waypoint) => {
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
          setActivePeer: (peer) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.activePeer = peer;
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
                const currentNode =
                  device.nodes.get(user.from) ?? new Protobuf.NodeInfo();
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
                const currentNode =
                  device.nodes.get(position.from) ?? new Protobuf.NodeInfo();
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
                const messageIndex =
                  message.type === "direct"
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
                console.log("setMessageState called");
                const device = draft.devices.get(id);
                if (!device) {
                  console.log("no device found for id");
                  return;
                }
                const messageGroup = device.messages[type];

                const messageIndex =
                  type === "direct"
                    ? from === device.hardware.myNodeNum
                      ? to
                      : from
                    : channelIndex;
                const messages = messageGroup.get(messageIndex);

                if (!messages) {
                  console.log("no messages found for id");
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
          processPacket(data: processPacketParams) {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }
                const node = device.nodes.get(data.from);
                if (!node) {
                  device.nodes.set(
                    data.from,
                    new Protobuf.NodeInfo({
                      num: data.from,
                      lastHeard: data.time,
                      snr: data.snr,
                    }),
                  );
                } else {
                  device.nodes.set(data.from, {
                    ...node,
                    lastHeard: data.time,
                    snr: data.snr,
                  });
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
