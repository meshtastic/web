import { Protobuf, Types } from '@meshtastic/meshtasticjs';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface MessageWithAck {
  message: Types.TextPacket;
  ack: boolean;
  received: Date;
}

export interface Chat {
  lastInterraction: Date;
  messages: MessageWithAck[];
}

type ChatEntries = {
  [key in number]: Chat;
};

interface Route {
  from: number;
  to: number;
  hops: number;

  //speed stats?
}

export interface Node {
  metrics: Protobuf.DeviceMetrics;
  data: Protobuf.NodeInfo;
}

export interface Radio {
  channels: Protobuf.Channel[];
  config: Config;
  moduleConfig: ModuleConfig;
  hardware: Protobuf.MyNodeInfo;
}

export interface Config {
  device: Protobuf.Config_DeviceConfig;
  position: Protobuf.Config_PositionConfig;
  power: Protobuf.Config_PowerConfig;
  wifi: Protobuf.Config_WiFiConfig;
  display: Protobuf.Config_DisplayConfig;
  lora: Protobuf.Config_LoRaConfig;
}

export interface ModuleConfig {
  mqtt: Protobuf.ModuleConfig_MQTTConfig;
  serial: Protobuf.ModuleConfig_SerialConfig;
  extNotification: Protobuf.ModuleConfig_ExternalNotificationConfig;
  storeForward: Protobuf.ModuleConfig_StoreForwardConfig;
  rangeTest: Protobuf.ModuleConfig_RangeTestConfig;
  telemetry: Protobuf.ModuleConfig_TelemetryConfig;
  cannedMessage: Protobuf.ModuleConfig_CannedMessageConfig;
}

interface MeshtasticState {
  deviceStatus: Types.DeviceStatusEnum;
  lastMeshInterraction: number;
  ready: boolean;
  nodes: Node[];
  radio: Radio;
  chats: ChatEntries;
  logs: Types.LogEventPacket[];
}

const initialState: MeshtasticState = {
  deviceStatus: Types.DeviceStatusEnum.DEVICE_DISCONNECTED,
  lastMeshInterraction: 0,
  ready: false,
  nodes: [],
  radio: {
    channels: [],
    config: {
      device: Protobuf.Config_DeviceConfig.create(),
      position: Protobuf.Config_PositionConfig.create(),
      power: Protobuf.Config_PowerConfig.create(),
      wifi: Protobuf.Config_WiFiConfig.create(),
      display: Protobuf.Config_DisplayConfig.create(),
      lora: Protobuf.Config_LoRaConfig.create(),
    },
    moduleConfig: {
      mqtt: Protobuf.ModuleConfig_MQTTConfig.create(),
      serial: Protobuf.ModuleConfig_SerialConfig.create(),
      extNotification:
        Protobuf.ModuleConfig_ExternalNotificationConfig.create(),
      storeForward: Protobuf.ModuleConfig_StoreForwardConfig.create(),
      rangeTest: Protobuf.ModuleConfig_RangeTestConfig.create(),
      telemetry: Protobuf.ModuleConfig_TelemetryConfig.create(),
      cannedMessage: Protobuf.ModuleConfig_CannedMessageConfig.create(),
    },
    hardware: Protobuf.MyNodeInfo.create(),
  },
  chats: {},
  logs: [],
};

export const meshtasticSlice = createSlice({
  name: 'meshtastic',
  initialState,
  reducers: {
    addLogEvent: (state, action: PayloadAction<Types.LogEventPacket>) => {
      state.logs.push(action.payload);
    },
    clearLogs: (state) => {
      state.logs = [];
    },
    setDeviceStatus: (state, action: PayloadAction<Types.DeviceStatusEnum>) => {
      state.deviceStatus = action.payload;
    },
    setLastMeshInterraction: (state, action: PayloadAction<number>) => {
      state.lastMeshInterraction = action.payload;
    },
    setReady: (state, action: PayloadAction<boolean>) => {
      state.ready = action.payload;
    },
    setMyNodeInfo: (state, action: PayloadAction<Protobuf.MyNodeInfo>) => {
      state.radio.hardware = action.payload;
    },
    addUser: (state, action: PayloadAction<Types.UserPacket>) => {
      const node = state.nodes.find(
        (node) => node.data.num === action.payload.packet.from,
      );
      if (node) {
        node.data.user = action.payload.data;
        if (action.payload.packet.rxTime) {
          node.data.lastHeard = new Date(
            action.payload.packet.rxTime * 1000,
          ).getTime();
        }
      } else {
        state.nodes.push({
          data: {
            num: action.payload.packet.from,
            snr: action.payload.packet.rxSnr,
            lastHeard: new Date().getTime(),
            ...action.payload.packet,
          },
          metrics: Protobuf.DeviceMetrics.create(),
        });
      }
    },
    addPosition: (state, action: PayloadAction<Types.PositionPacket>) => {
      const node = state.nodes.find(
        (node) => node.data.num === action.payload.packet.from,
      );

      if (node) {
        node.data.position = action.payload.data;
        if (action.payload.packet.rxTime) {
          node.data.lastHeard = new Date(
            action.payload.packet.rxTime * 1000,
          ).getTime();
        }
      }
    },
    addNode: (state, action: PayloadAction<Protobuf.NodeInfo>) => {
      const node = state.nodes.find(
        (node) => node.data.num === action.payload.num,
      );

      if (node) {
        node.data.lastHeard = new Date(
          action.payload.lastHeard * 1000,
        ).getTime();
        node.data.snr = action.payload.snr;
      } else {
        state.nodes.push({
          data: action.payload,
          metrics: Protobuf.DeviceMetrics.create(),
        });
      }
    },
    addChannel: (state, action: PayloadAction<Protobuf.Channel>) => {
      if (
        state.radio.channels.findIndex(
          (channel) => channel.index === action.payload.index,
        ) !== -1
      ) {
        state.radio.channels = state.radio.channels.map((channel) => {
          return channel.index === action.payload.index
            ? action.payload
            : channel;
        });
      } else {
        state.radio.channels.push(action.payload);
      }
    },
    setConfig: (state, action: PayloadAction<Protobuf.Config>) => {
      switch (action.payload.payloadVariant.oneofKind) {
        case 'device': {
          state.radio.config.device = action.payload.payloadVariant.device;
          break;
        }
        case 'position': {
          state.radio.config.position = action.payload.payloadVariant.position;
          break;
        }
        case 'power': {
          state.radio.config.power = action.payload.payloadVariant.power;
          break;
        }
        case 'wifi': {
          state.radio.config.wifi = action.payload.payloadVariant.wifi;
          break;
        }
        case 'display': {
          state.radio.config.display = action.payload.payloadVariant.display;
          break;
        }
        case 'lora': {
          state.radio.config.lora = action.payload.payloadVariant.lora;
          break;
        }
      }
    },
    setModuleConfig: (state, action: PayloadAction<Protobuf.ModuleConfig>) => {
      switch (action.payload.payloadVariant.oneofKind) {
        case 'cannedMessage': {
          state.radio.moduleConfig.cannedMessage =
            action.payload.payloadVariant.cannedMessage;
          break;
        }
        case 'externalNotification': {
          state.radio.moduleConfig.extNotification =
            action.payload.payloadVariant.externalNotification;
          break;
        }
        case 'mqtt': {
          state.radio.moduleConfig.mqtt = action.payload.payloadVariant.mqtt;
          break;
        }
        case 'rangeTest': {
          state.radio.moduleConfig.rangeTest =
            action.payload.payloadVariant.rangeTest;
          break;
        }
        case 'serial': {
          state.radio.moduleConfig.serial =
            action.payload.payloadVariant.serial;
          break;
        }
        case 'storeForward': {
          state.radio.moduleConfig.storeForward =
            action.payload.payloadVariant.storeForward;
          break;
        }
        case 'telemetry': {
          state.radio.moduleConfig.telemetry =
            action.payload.payloadVariant.telemetry;
          break;
        }
      }
    },
    addMessage: (state, action: PayloadAction<MessageWithAck>) => {
      // todo: is last interraction for just channel chats or dm's to?
      state.chats[action.payload.message.packet.channel].lastInterraction =
        new Date();

      if (action.payload.message.packet.to === 0xffffffff) {
        // TODO: use chatIndex
        state.chats[action.payload.message.packet.channel].messages.push(
          action.payload,
        );
      } else {
        const dmIndex =
          action.payload.message.packet.from === state.radio.hardware.myNodeNum
            ? action.payload.message.packet.to
            : action.payload.message.packet.from;

        state.chats[dmIndex].messages.push(action.payload);
      }
    },
    ackMessage: (
      state,
      action: PayloadAction<{ chatIndex: number; messageId: number }>,
    ) => {
      console.log(action.payload.chatIndex);

      console.log(state.chats);

      console.log(state.chats[action.payload.chatIndex]);

      state.chats[action.payload.chatIndex].messages.map((message) => {
        console.log('ack');

        if (message.message.packet.id === action.payload.messageId) {
          console.log('acked');

          message.ack = true;
        }
      });
    },
    updateLastInteraction: (
      state,
      action: PayloadAction<{ id: number; time: Date }>,
    ) => {
      const node = state.nodes.find(
        (node) => node.data.num === action.payload.id,
      );
      if (node) {
        node.data.lastHeard = action.payload.time.getTime();
      }
    },
    addChat: (state, action: PayloadAction<number>) => {
      state.chats[action.payload] = {
        messages: [],
        lastInterraction: new Date(),
      };
    },
    resetState: (state) => {
      state.deviceStatus = Types.DeviceStatusEnum.DEVICE_DISCONNECTED;
      state.nodes = [];
      state.radio = initialState.radio;
      state.ready = false;
      state.lastMeshInterraction = 0;
    },
  },
});

export const {
  addLogEvent,
  clearLogs,
  setDeviceStatus,
  setLastMeshInterraction,
  setReady,
  setMyNodeInfo,
  addUser,
  addPosition,
  addNode,
  addChannel,
  setConfig,
  setModuleConfig,
  addMessage,
  ackMessage,
  updateLastInteraction,
  addChat,
  resetState,
} = meshtasticSlice.actions;

export default meshtasticSlice.reducer;
