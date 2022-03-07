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

interface CurrentPosition {
  latitudeI: number;
  longitudeI: number;
  altitude: number;
  posTimestamp: number;
  satsInView: number;
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
  number: number;
  lastHeard: Date;
  snr: number[];
  positions: Protobuf.Position[];
  currentPosition?: CurrentPosition;
  user?: Protobuf.User;
  routes: Route[];
}

export interface Radio {
  channels: Protobuf.Channel[];
  preferences: Protobuf.RadioConfig_UserPreferences;
  hardware: Protobuf.MyNodeInfo;
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
    preferences: Protobuf.RadioConfig_UserPreferences.create(),
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
        (node) => node.number === action.payload.packet.from,
      );
      if (node) {
        node.user = action.payload.data;
        if (action.payload.packet.rxTime) {
          node.lastHeard = new Date(action.payload.packet.rxTime * 1000);
        }
      } else {
        state.nodes.push({
          number: action.payload.packet.from,
          lastHeard: new Date(),
          snr: [action.payload.packet.rxSnr],
          user: action.payload.data,
          positions: [],
          routes: [],
        });
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
            posTimestamp: action.payload.data.posTimestamp,
            satsInView:
              action.payload.data.satsInView ??
              node.currentPosition?.satsInView,
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
        node.lastHeard = new Date(action.payload.lastHeard * 1000);
        node.snr.push(action.payload.snr);
      } else {
        state.nodes.push({
          number: action.payload.num,
          lastHeard: new Date(action.payload.lastHeard * 1000),
          snr: [action.payload.snr],
          positions: [],
          routes: [],
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
    addRoute: (state, action: PayloadAction<Route>) => {
      const node = state.nodes.find(
        (node) => node.number === action.payload.from,
      );
      const exists = node?.routes.findIndex(
        (route) =>
          route.from === action.payload.from && route.to === action.payload.to,
      );

      if (exists === -1) {
        node?.routes.push(action.payload);
      }
    },
    setPreferences: (
      state,
      action: PayloadAction<Protobuf.RadioConfig_UserPreferences>,
    ) => {
      state.radio.preferences = action.payload;
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
        (node) => node.number === action.payload.id,
      );
      if (node) {
        node.lastHeard = action.payload.time;
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
  setPreferences,
  addRoute,
  addMessage,
  ackMessage,
  updateLastInteraction,
  addChat,
  resetState,
} = meshtasticSlice.actions;

export default meshtasticSlice.reducer;
