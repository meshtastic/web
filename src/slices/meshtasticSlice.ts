import { Protobuf, Types } from '@meshtastic/meshtasticjs';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface MessageWithAck {
  message: Types.TextPacket;
  ack: boolean;
  isSender: boolean;
  received: Date;
}

interface AppState {
  deviceStatus: Types.DeviceStatusEnum;
  lastMeshInterraction: number;
  ready: boolean;
  myNodeInfo: Protobuf.MyNodeInfo;
  positionPackets: Types.PositionPacket[];
  nodes: Protobuf.NodeInfo[];
  channels: Protobuf.Channel[];
  preferences: Protobuf.RadioConfig_UserPreferences;
  messages: MessageWithAck[];
}

const initialState: AppState = {
  deviceStatus: Types.DeviceStatusEnum.DEVICE_DISCONNECTED,
  lastMeshInterraction: 0,
  ready: false,
  myNodeInfo: Protobuf.MyNodeInfo.create(),
  positionPackets: [],
  nodes: [],
  channels: [],
  preferences: Protobuf.RadioConfig_UserPreferences.create(),
  messages: [],
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
    addPositionPacket: (state, action: PayloadAction<Types.PositionPacket>) => {
      state.positionPackets.push(action.payload);
    },
    addNode: (state, action: PayloadAction<Protobuf.NodeInfo>) => {
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
  },
});

export const {
  setDeviceStatus,
  setLastMeshInterraction,
  setReady,
  setMyNodeInfo,
  addPositionPacket,
  addNode,
  addChannel,
  setPreferences,
  addMessage,
  ackMessage,
} = meshtasticSlice.actions;

export default meshtasticSlice.reducer;
