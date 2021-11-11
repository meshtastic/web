import { Protobuf, Types } from '@meshtastic/meshtasticjs';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import { connection } from '../connection';

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

interface MeshtasticState {
  deviceStatus: Types.DeviceStatusEnum;
  lastMeshInterraction: number;
  ready: boolean;
  myNodeInfo: Protobuf.MyNodeInfo;
  myNode: Protobuf.NodeInfo;
  users: Types.UserPacket[];
  positionPackets: Types.PositionPacket[];
  nodes: Protobuf.NodeInfo[];
  channels: Protobuf.Channel[];
  preferences: Protobuf.RadioConfig_UserPreferences;
  messages: MessageWithAck[];
  hostOverrideEnabled: boolean;
  hostOverride: string;
  connectionType: connType;
}

const initialState: MeshtasticState = {
  deviceStatus: Types.DeviceStatusEnum.DEVICE_DISCONNECTED,
  lastMeshInterraction: 0,
  ready: false,
  myNodeInfo: Protobuf.MyNodeInfo.create(),
  myNode: Protobuf.NodeInfo.create(),
  users: [],
  positionPackets: [],
  nodes: [],
  channels: [],
  preferences: Protobuf.RadioConfig_UserPreferences.create(),
  messages: [],
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
      state.myNodeInfo = action.payload;
    },
    addUser: (state, action: PayloadAction<Types.UserPacket>) => {
      if (
        state.users.findIndex(
          (user) => user.data.id === action.payload.data.id,
        ) !== -1
      ) {
        state.users = state.users.map((user) => {
          return user.data.id === action.payload.data.id
            ? action.payload
            : user;
        });
      } else {
        state.users.push(action.payload);
      }
    },
    addPosition: (state, action: PayloadAction<Types.PositionPacket>) => {
      state.positionPackets.push(action.payload);
    },
    addNode: (state, action: PayloadAction<Protobuf.NodeInfo>) => {
      if (action.payload.num === state.myNodeInfo.myNodeNum) {
        state.myNode = action.payload;
      }
      if (
        state.nodes.findIndex((node) => node.num === action.payload.num) !== -1
      ) {
        state.nodes = state.nodes.map((node) => {
          return node.num === action.payload.num ? action.payload : node;
        });
      } else {
        state.nodes.push(action.payload);
      }
    },
    addChannel: (state, action: PayloadAction<Protobuf.Channel>) => {
      if (
        state.channels.findIndex(
          (channel) => channel.index === action.payload.index,
        ) !== -1
      ) {
        state.channels = state.channels.map((channel) => {
          return channel.index === action.payload.index
            ? action.payload
            : channel;
        });
      } else {
        state.channels.push(action.payload);
      }
    },
    setPreferences: (
      state,
      action: PayloadAction<Protobuf.RadioConfig_UserPreferences>,
    ) => {
      state.preferences = action.payload;
    },
    addMessage: (state, action: PayloadAction<MessageWithAck>) => {
      state.messages.push(action.payload);
    },
    ackMessage: (state, messageId: PayloadAction<number>) => {
      state.messages.map((message) => {
        if (message.message.packet.id === messageId.payload) {
          message.ack = true;
        }
      });
    },
    setHostOverrideEnabled: (state, action: PayloadAction<boolean>) => {
      state.hostOverrideEnabled = action.payload;
      localStorage.setItem('hostOverrideEnabled', String(action.payload));
      if (state.hostOverrideEnabled !== action.payload) {
        connection.disconnect();
      }
    },
    setHostOverride: (state, action: PayloadAction<string>) => {
      state.hostOverride = action.payload;
      localStorage.setItem('hostOverride', action.payload);
      if (state.hostOverride !== action.payload) {
        connection.disconnect();
      }
    },
    setConnectionType: (state, action: PayloadAction<connType>) => {
      state.connectionType = action.payload;
      localStorage.setItem('connectionType', String(action.payload));
      if (state.connectionType !== action.payload) {
        connection.disconnect();
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
