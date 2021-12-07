import { Protobuf, Types } from '@meshtastic/meshtasticjs';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface MessageWithAck {
  message: Types.TextPacket;
  ack: boolean;
  isSender: boolean;
  received: Date;
}

export interface ChannelData {
  channel: Protobuf.Channel;
  messages: MessageWithAck[];
}

interface CurrentPosition {
  latitudeI: number;
  longitudeI: number;
  altitude: number;
  posTimestamp: number;
}

export interface Node {
  number: number;
  lastHeard: Date;
  snr: number[];
  positions: Protobuf.Position[];
  currentPosition?: CurrentPosition;
  user?: Protobuf.User;
}

export interface Radio {
  channels: ChannelData[];
  preferences: Protobuf.RadioConfig_UserPreferences;
  hardware: Protobuf.MyNodeInfo;
}

interface MeshtasticState {
  deviceStatus: Types.DeviceStatusEnum;
  lastMeshInterraction: number;
  ready: boolean;
  nodes: Node[];
  radio: Radio;
  hostOverrideEnabled: boolean;
  hostOverride: string;
}

const initialState: MeshtasticState = {
  deviceStatus: Types.DeviceStatusEnum.DEVICE_DISCONNECTED,
  lastMeshInterraction: 0,
  ready: false,
  nodes: [],
  radio: {
    channels: [],
    preferences: Protobuf.RadioConfig_UserPreferences.create(),
    hardware: Protobuf.MyNodeInfo.create(),
  },
  //todo implement
  // connectionMethod: localStorage.getItem('connectionMethod'),
  hostOverrideEnabled:
    localStorage.getItem('hostOverrideEnabled') === 'true' ?? false,
  hostOverride: localStorage.getItem('hostOverride') ?? '',
};

export const meshtasticSlice = createSlice({
  name: 'meshtastic',
  initialState,
  reducers: {
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
        (node) => node.number === action.payload.packet.from,
      );
      if (node) {
        node.user = action.payload.data;
        if (action.payload.packet.rxTime) {
          node.lastHeard = new Date(action.payload.packet.rxTime * 1000);
        }
      } else {
        console.log('Node not in DB');
      }
    },
    addPosition: (state, action: PayloadAction<Types.PositionPacket>) => {
      const node = state.nodes.find(
        (node) => node.number === action.payload.packet.from,
      );

      if (node) {
        node.positions.push(action.payload.data);

        if (
          action.payload.data.latitudeI ||
          action.payload.data.longitudeI ||
          action.payload.data.altitude
        ) {
          node.currentPosition = {
            latitudeI:
              action.payload.data.latitudeI ?? node.currentPosition?.latitudeI,
            longitudeI:
              action.payload.data.longitudeI ??
              node.currentPosition?.longitudeI,
            altitude:
              action.payload.data.altitude ?? node.currentPosition?.altitude,
            posTimestamp: action.payload.data.posTimestamp, //maybe new date?
          };
        }

        if (action.payload.packet.rxTime) {
          node.lastHeard = new Date(action.payload.packet.rxTime * 1000);
        }
      }
    },
    addNode: (state, action: PayloadAction<Protobuf.NodeInfo>) => {
      const node = state.nodes.find(
        (node) => node.number === action.payload.num,
      );

      if (node) {
        console.log('node exists');

        node.lastHeard = new Date(action.payload.lastHeard * 1000);
        node.snr.push(action.payload.snr);
      } else {
        state.nodes.push({
          number: action.payload.num,
          lastHeard: new Date(action.payload.lastHeard * 1000),
          snr: [action.payload.snr],
          positions: [],
        });
      }
    },
    addChannel: (state, action: PayloadAction<Protobuf.Channel>) => {
      if (
        state.radio.channels.findIndex(
          (channel) => channel.channel.index === action.payload.index,
        ) !== -1
      ) {
        state.radio.channels = state.radio.channels.map((channel) => {
          return channel.channel.index === action.payload.index
            ? {
                channel: action.payload,
                messages: channel.messages,
              }
            : channel;
        });
      } else {
        state.radio.channels.push({
          channel: action.payload,
          messages: [],
        });
      }
    },
    setPreferences: (
      state,
      action: PayloadAction<Protobuf.RadioConfig_UserPreferences>,
    ) => {
      state.radio.preferences = action.payload;
    },
    addMessage: (state, action: PayloadAction<MessageWithAck>) => {
      const channelIndex = state.radio.channels.findIndex(
        (channel) =>
          channel.channel.index === action.payload.message.packet.channel,
      );
      state.radio.channels[channelIndex].messages.push(action.payload);
    },
    ackMessage: (
      state,
      action: PayloadAction<{ channel: number; messageId: number }>,
    ) => {
      const channelIndex = state.radio.channels.findIndex(
        (channel) => channel.channel.index === action.payload.channel,
      );
      state.radio.channels[channelIndex].messages.map((message) => {
        if (message.message.packet.id === action.payload.messageId) {
          message.ack = true;
        }
      });
    },
    updateLastInteraction: (
      state,
      action: PayloadAction<{ id: number; time: Date }>,
    ) => {
      const node = state.nodes.find(
        (node) => node.number === action.payload.id,
      );
      if (node) {
        node.lastHeard = action.payload.time;
      }
    },
    setHostOverrideEnabled: (state, action: PayloadAction<boolean>) => {
      state.hostOverrideEnabled = action.payload;
      localStorage.setItem('hostOverrideEnabled', String(action.payload));
      if (state.hostOverrideEnabled !== action.payload) {
        // connection.disconnect();
      }
    },
    setHostOverride: (state, action: PayloadAction<string>) => {
      state.hostOverride = action.payload;
      localStorage.setItem('hostOverride', action.payload);
      if (state.hostOverride !== action.payload) {
        // connection.disconnect();
      }
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
  setDeviceStatus,
  setLastMeshInterraction,
  setReady,
  setMyNodeInfo,
  addUser,
  addPosition,
  addNode,
  addChannel,
  setPreferences,
  addMessage,
  ackMessage,
  updateLastInteraction,
  setHostOverrideEnabled,
  setHostOverride,
  resetState,
} = meshtasticSlice.actions;

export default meshtasticSlice.reducer;
