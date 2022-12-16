import { createContext } from "react";

import { produce } from "immer";
import create from "zustand";

import { Protobuf, Types } from "@meshtastic/meshtasticjs";

export type Page =
  | "messages"
  | "map"
  | "extensions"
  | "config"
  | "channels"
  | "peers"
  | "info"
  | "logs"
  | "setup";

export interface MessageWithState extends Types.PacketMetadata<string> {
  state: MessageState;
}

export interface WaypointIDWithState
  extends Omit<Types.PacketMetadata<Protobuf.Waypoint>, "data"> {
  waypointID: number;
  state: MessageState;
}

export type AllMessageTypes = MessageWithState | WaypointIDWithState;

export type MessageState = "ack" | "waiting" | Protobuf.Routing_Error;

export interface Channel {
  config: Protobuf.Channel;
  lastInterraction: Date;
  messages: AllMessageTypes[];
}

export interface Node {
  deviceMetrics: (Protobuf.DeviceMetrics & { timestamp: Date })[];
  environmentMetrics: (Protobuf.EnvironmentMetrics & { timestamp: Date })[];
  metadata?: Protobuf.DeviceMetadata;
  data: Protobuf.NodeInfo;
}

export interface processPacketParams {
  from: number;
  snr: number;
  time: number;
}

export interface Device {
  id: number;
  ready: boolean;
  status: Types.DeviceStatusEnum;
  channels: Channel[];
  config: Protobuf.LocalConfig;
  moduleConfig: Protobuf.LocalModuleConfig;
  hardware: Protobuf.MyNodeInfo;
  nodes: Node[];
  connection?: Types.ConnectionType;
  activePage: Page;
  peerInfoOpen: boolean;
  activePeer: number;
  waypoints: Protobuf.Waypoint[];
  regionUnset: boolean;
  currentMetrics: Protobuf.DeviceMetrics;
  importDialogOpen: boolean;
  QRDialogOpen: boolean;
  shutdownDialogOpen: boolean;
  rebootDialogOpen: boolean;
  pendingSettingsChanges: boolean;

  setReady(ready: boolean): void;
  setStatus: (status: Types.DeviceStatusEnum) => void;
  setConfig: (config: Protobuf.Config) => void;
  setModuleConfig: (config: Protobuf.ModuleConfig) => void;
  setHardware: (hardware: Protobuf.MyNodeInfo) => void;
  setMetrics: (metrics: Types.PacketMetadata<Protobuf.Telemetry>) => void;
  setActivePage: (page: Page) => void;
  setPeerInfoOpen: (open: boolean) => void;
  setActivePeer: (peer: number) => void;
  setPendingSettingsChanges: (state: boolean) => void;
  addChannel: (channel: Channel) => void;
  addWaypoint: (waypoint: Protobuf.Waypoint) => void;
  addNodeInfo: (nodeInfo: Protobuf.NodeInfo) => void;
  addUser: (user: Types.PacketMetadata<Protobuf.User>) => void;
  addPosition: (position: Types.PacketMetadata<Protobuf.Position>) => void;
  addConnection: (connection: Types.ConnectionType) => void;
  addMessage: (message: MessageWithState) => void;
  addWaypointMessage: (message: WaypointIDWithState) => void;
  addDeviceMetadataMessage: (
    metadata: Types.PacketMetadata<Protobuf.DeviceMetadata>
  ) => void;
  setMessageState: (
    channelIndex: number,
    messageId: number,
    state: MessageState
  ) => void;
  setImportDialogOpen: (open: boolean) => void;
  setQRDialogOpen: (open: boolean) => void;
  setShutdownDialogOpen: (open: boolean) => void;
  setRebootDialogOpen: (open: boolean) => void;
  processPacket: (data: processPacketParams) => void;
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
          ready: false,
          status: Types.DeviceStatusEnum.DEVICE_DISCONNECTED,
          channels: [],
          config: Protobuf.LocalConfig.create(),
          moduleConfig: Protobuf.LocalModuleConfig.create(),
          hardware: Protobuf.MyNodeInfo.create(),
          nodes: [],
          connection: undefined,
          activePage: "messages",
          peerInfoOpen: false,
          activePeer: 0,
          waypoints: [],
          regionUnset: false,
          currentMetrics: Protobuf.DeviceMetrics.create(),
          importDialogOpen: false,
          QRDialogOpen: false,
          shutdownDialogOpen: false,
          rebootDialogOpen: false,
          pendingSettingsChanges: false,

          setReady: (ready: boolean) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.ready = ready;
                }
              })
            );
          },
          setStatus: (status: Types.DeviceStatusEnum) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.status = status;
                }
              })
            );
          },
          setConfig: (config: Protobuf.Config) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);

                if (device) {
                  switch (config.payloadVariant.oneofKind) {
                    case "device":
                      device.config.device = config.payloadVariant.device;
                      break;
                    case "position":
                      device.config.position = config.payloadVariant.position;
                      break;
                    case "power":
                      device.config.power = config.payloadVariant.power;
                      break;
                    case "network":
                      device.config.network = config.payloadVariant.network;
                      break;
                    case "display":
                      device.config.display = config.payloadVariant.display;
                      break;
                    case "lora":
                      device.config.lora = config.payloadVariant.lora;
                      device.regionUnset =
                        config.payloadVariant.lora.region ===
                        Protobuf.Config_LoRaConfig_RegionCode.UNSET;
                      break;
                    case "bluetooth":
                      device.config.bluetooth = config.payloadVariant.bluetooth;
                      break;
                  }
                }
              })
            );
          },
          setModuleConfig: (config: Protobuf.ModuleConfig) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);

                if (device) {
                  switch (config.payloadVariant.oneofKind) {
                    case "mqtt":
                      device.moduleConfig.mqtt = config.payloadVariant.mqtt;
                      break;
                    case "serial":
                      device.moduleConfig.serial = config.payloadVariant.serial;
                      break;
                    case "externalNotification":
                      device.moduleConfig.externalNotification =
                        config.payloadVariant.externalNotification;
                      break;
                    case "storeForward":
                      device.moduleConfig.storeForward =
                        config.payloadVariant.storeForward;
                      break;
                    case "rangeTest":
                      device.moduleConfig.rangeTest =
                        config.payloadVariant.rangeTest;
                      break;
                    case "telemetry":
                      device.moduleConfig.telemetry =
                        config.payloadVariant.telemetry;
                      break;
                    case "cannedMessage":
                      device.moduleConfig.cannedMessage =
                        config.payloadVariant.cannedMessage;
                      break;
                  }
                }
              })
            );
          },
          setHardware: (hardware: Protobuf.MyNodeInfo) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.hardware = hardware;
                }
              })
            );
          },
          setMetrics: (metrics: Types.PacketMetadata<Protobuf.Telemetry>) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                let node = device?.nodes.find(
                  (n) => n.data.num === metrics.from
                );
                if (node) {
                  switch (metrics.data.variant.oneofKind) {
                    case "deviceMetrics":
                      if (device) {
                        if (metrics.data.variant.deviceMetrics.batteryLevel) {
                          device.currentMetrics.batteryLevel =
                            metrics.data.variant.deviceMetrics.batteryLevel;
                        }
                        if (metrics.data.variant.deviceMetrics.voltage) {
                          device.currentMetrics.voltage =
                            metrics.data.variant.deviceMetrics.voltage;
                        }
                        if (metrics.data.variant.deviceMetrics.airUtilTx) {
                          device.currentMetrics.airUtilTx =
                            metrics.data.variant.deviceMetrics.airUtilTx;
                        }
                        if (
                          metrics.data.variant.deviceMetrics.channelUtilization
                        ) {
                          device.currentMetrics.channelUtilization =
                            metrics.data.variant.deviceMetrics.channelUtilization;
                        }
                      }
                      node.deviceMetrics.push({
                        ...metrics.data.variant.deviceMetrics,
                        timestamp: metrics.rxTime
                      });
                      break;
                    case "environmentMetrics":
                      node.environmentMetrics.push({
                        ...metrics.data.variant.environmentMetrics,
                        timestamp: metrics.rxTime
                      });
                      break;
                  }
                }
              })
            );
          },
          setActivePage: (page) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.activePage = page;
                }
              })
            );
          },
          setPendingSettingsChanges: (state) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.pendingSettingsChanges = state;
                }
              })
            );
          },
          addChannel: (channel: Channel) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  const channelIndex = device.channels.findIndex(
                    (c) => c.config.index === channel.config.index
                  );
                  if (channelIndex !== -1) {
                    const messages = device.channels[channelIndex].messages;
                    device.channels[channelIndex] = channel;
                    device.channels[channelIndex].messages = messages;
                  } else {
                    device.channels.push(channel);
                  }
                }
              })
            );
          },
          addWaypoint: (waypoint: Protobuf.Waypoint) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  const waypointIndex = device.waypoints.findIndex(
                    (wp) => wp.id === waypoint.id
                  );

                  if (waypointIndex !== -1) {
                    device.waypoints[waypointIndex] = waypoint;
                  } else {
                    device.waypoints.push(waypoint);
                  }
                }
              })
            );
          },
          addNodeInfo: (nodeInfo) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                const node = device?.nodes.find(
                  (node) => node.data.num === nodeInfo.num
                );
                if (node) {
                  node.data = nodeInfo;
                } else {
                  device?.nodes.push({
                    data: nodeInfo,
                    metadata: undefined,
                    deviceMetrics: [],
                    environmentMetrics: []
                  });
                }
              })
            );
          },
          setPeerInfoOpen: (open) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.peerInfoOpen = open;
                }
              })
            );
          },
          setActivePeer: (peer) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.activePeer = peer;
                }
              })
            );
          },
          addUser: (user) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                const node = device?.nodes.find(
                  (node) => node.data.num === user.from
                );
                if (node) {
                  node.data.user = user.data;
                }
              })
            );
          },
          addPosition: (position) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                const node = device?.nodes.find(
                  (node) => node.data.num === position.from
                );
                if (node) {
                  node.data.position = position.data;
                }
              })
            );
          },
          addConnection: (connection) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.connection = connection;
                }
              })
            );
          },
          addMessage: (message) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                device?.channels
                  .find((ch) => ch.config.index === message.channel)
                  ?.messages.push(message);
              })
            );
          },
          addWaypointMessage: (waypointID) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                device?.channels
                  .find((ch) => ch.config.index === waypointID.channel)
                  ?.messages.push(waypointID);
              })
            );
          },
          addDeviceMetadataMessage: (metadata) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                const node = device?.nodes.find(
                  (n) => n.data.num === metadata.from
                );
                if (node) {
                  node.metadata = metadata.data;
                }
              })
            );
          },
          setMessageState: (
            channelIndex: number,
            messageId: number,
            state: MessageState
          ) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);

                const channel = device?.channels.find(
                  (ch) => ch.config.index === channelIndex
                );
                const message = channel?.messages.find(
                  (msg) => msg.id === messageId
                );
                if (message) {
                  message.state = state;
                }
              })
            );
          },
          setImportDialogOpen: (open: boolean) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.importDialogOpen = open;
                }
              })
            );
          },
          setQRDialogOpen: (open: boolean) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.QRDialogOpen = open;
                }
              })
            );
          },
          setShutdownDialogOpen: (open: boolean) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.shutdownDialogOpen = open;
                }
              })
            );
          },
          setRebootDialogOpen: (open: boolean) => {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (device) {
                  device.rebootDialogOpen = open;
                }
              })
            );
          },
          processPacket(data: processPacketParams) {
            set(
              produce<DeviceState>((draft) => {
                const device = draft.devices.get(id);
                if (!device) {
                  return;
                }
                const node = device.nodes.find((n) => n.data.num === data.from);
                if (!node) {
                  device.nodes.push({
                    data: Protobuf.NodeInfo.create({
                      num: data.from,
                      lastHeard: data.time,
                      snr: data.snr
                    }),
                    metadata: undefined,
                    deviceMetrics: [],
                    environmentMetrics: []
                  });
                  return;
                } else {
                  node.data = {
                    ...node.data,
                    lastHeard: data.time,
                    snr: data.snr
                  };
                }
              })
            );
          }
        });
      })
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
      })
    );
  },

  getDevices: () => Array.from(get().devices.values()),

  getDevice: (id) => get().devices.get(id)
}));

export const DeviceContext = createContext<Device | undefined>(undefined);
