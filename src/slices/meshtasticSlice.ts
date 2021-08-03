import { Protobuf, Types } from '@meshtastic/meshtasticjs';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

interface AppState {
  deviceStatus: Types.DeviceStatusEnum;
  myId: number;
  lastMeshInterraction: number;
  ready: boolean;
  fromRaioPackets: Protobuf.FromRadio[];
  meshPackets: Protobuf.MeshPacket[];
  myNodeInfo: Protobuf.MyNodeInfo;
  radioConfig: Protobuf.RadioConfig[];
  routingPackets: Types.RoutingPacket[];
  positionPackets: Types.PositionPacket[];
  textPackets: Types.TextPacket[];
  logRecords: Protobuf.LogRecord[];
  //
  nodes: Protobuf.NodeInfo[];
  channels: Protobuf.Channel[];
  preferences: Protobuf.RadioConfig_UserPreferences;
}

const initialState: AppState = {
  deviceStatus: Types.DeviceStatusEnum.DEVICE_DISCONNECTED,
  myId: 0,
  lastMeshInterraction: 0,
  ready: false,
  fromRaioPackets: [],
  meshPackets: [],
  myNodeInfo: Protobuf.MyNodeInfo.create(),
  radioConfig: [],
  routingPackets: [],
  positionPackets: [],
  textPackets: [],
  logRecords: [],
  //
  nodes: [],
  channels: [],
  preferences: Protobuf.RadioConfig_UserPreferences.create(),
};

export const meshtasticSlice = createSlice({
  name: 'meshtastic',
  initialState,
  reducers: {
    setDeviceStatus: (state, action: PayloadAction<Types.DeviceStatusEnum>) => {
      state.deviceStatus = action.payload;
    },
    setMyId: (state, action: PayloadAction<number>) => {
      state.myId = action.payload;
    },
    setLastMeshInterraction: (state, action: PayloadAction<number>) => {
      state.lastMeshInterraction = action.payload;
    },
    setReady: (state, action: PayloadAction<boolean>) => {
      state.ready = action.payload;
    },
    addFromRadioPacket: (state, action: PayloadAction<Protobuf.FromRadio>) => {
      state.fromRaioPackets.push(action.payload);
    },
    addMeshPacket: (state, action: PayloadAction<Protobuf.MeshPacket>) => {
      state.meshPackets.push(action.payload);
    },
    setMyNodeInfo: (state, action: PayloadAction<Protobuf.MyNodeInfo>) => {
      state.myNodeInfo = action.payload;
    },
    addRadioConfig: (state, action: PayloadAction<Protobuf.RadioConfig>) => {
      state.radioConfig.push(action.payload);
    },
    addRoutingPacket: (state, action: PayloadAction<Types.RoutingPacket>) => {
      state.routingPackets.push(action.payload);
    },
    addPositionPacket: (state, action: PayloadAction<Types.PositionPacket>) => {
      state.positionPackets.push(action.payload);
    },
    addTextPacket: (state, action: PayloadAction<Types.TextPacket>) => {
      state.textPackets.push(action.payload);
    },
    addLogRecord: (state, action: PayloadAction<Protobuf.LogRecord>) => {
      state.logRecords.push(action.payload);
    },
    //
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
  },
});

export const {
  setDeviceStatus,
  setMyId,
  setLastMeshInterraction,
  setReady,
  addFromRadioPacket,
  addMeshPacket,
  setMyNodeInfo,
  addRadioConfig,
  addRoutingPacket,
  addPositionPacket,
  addTextPacket,
  addLogRecord,
  addNode,
  addChannel,
  setPreferences,
} = meshtasticSlice.actions;

export default meshtasticSlice.reducer;
