import { Protobuf, Types } from '@meshtastic/meshtasticjs';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

// import { connection } from '../connection';

export interface MessageWithAck {
  message: Types.TextPacket;
  ack: boolean;
  isSender: boolean;
  received: Date;
}
enum connType {
  HTTP,
  BLE,
  SERIAL,
}

export interface ChannelData {
  channel: Protobuf.Channel;
  messages: MessageWithAck[];
}

export interface Node {
  number: number;
  lastHeard: Date;
  snr: number[];
  positions: Protobuf.Position[];
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
  connectionType: connType;
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
  connectionType: parseInt(localStorage.getItem('connectionType') ?? '0'),
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
        // todo: use rx time
        node.lastHeard = new Date();
      }
    },
    addPosition: (state, action: PayloadAction<Types.PositionPacket>) => {
      const node = state.nodes.find(
        (node) => node.number === action.payload.packet.from,
      );

      node?.positions.push(action.payload.data);
      if (node) {
        // todo: use rx time
        node.lastHeard = new Date();
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
        console.log('node does not exist');

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
      // todo: update last mesh/user interraction here
      state.radio.channels[channelIndex].messages.map((message) => {
        if (message.message.packet.id === action.payload.messageId) {
          message.ack = true;
        }
      });
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
    setConnectionType: (state, action: PayloadAction<connType>) => {
      state.connectionType = action.payload;
      localStorage.setItem('connectionType', String(action.payload));
      if (state.connectionType !== action.payload) {
        // connection.disconnect();
      }
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
  setHostOverrideEnabled,
  setHostOverride,
} = meshtasticSlice.actions;

export default meshtasticSlice.reducer;
