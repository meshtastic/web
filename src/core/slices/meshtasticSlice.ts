import { Protobuf, Types } from '@meshtastic/meshtasticjs';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface MessageWithAck {
  message: Types.TextPacket;
  ack: boolean;
  received: Date;
}

export interface Chat {
  id: number; //Channel or user id (for dm's)
  messages: MessageWithAck[];
}

export interface ChannelData {
  channel: Protobuf.Channel;
  lastChatInterraction: Date;
  messages: MessageWithAck[];
}

interface CurrentPosition {
  latitudeI: number;
  longitudeI: number;
  altitude: number;
  posTimestamp: number;
  satsInView: number;
}

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
  chats: Chat[];
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
  chats: [],
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
        // todo: add node
        console.log('Node not in DB');
        console.log(action.payload);
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
        console.log('node exists');

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
          (channel) => channel.channel.index === action.payload.index,
        ) !== -1
      ) {
        state.radio.channels = state.radio.channels.map((channel) => {
          return channel.channel.index === action.payload.index
            ? {
                channel: action.payload,
                lastChatInterraction: new Date(),
                messages: channel.messages,
              }
            : channel;
        });
      } else {
        state.radio.channels.push({
          channel: action.payload,
          lastChatInterraction: new Date(),
          messages: [],
        });
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
      console.log(exists);

      if (exists === -1) {
        node?.routes.push(action.payload);
      }
      // node?.routes.map((route) => {
      //   if (

      //   ) {
      //     node?.routes.push(action.payload);
      //   }
      // });

      // if (node) {
      //   node.routes = node.routes.map((route) => {
      //     return route.from === action.payload.from &&
      //       route.to === action.payload.to
      //       ? action.payload
      //       : route;
      //   });
      // }
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
      state.radio.channels[channelIndex].lastChatInterraction = new Date();
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
    addChat: (state, action: PayloadAction<Chat>) => {
      if (state.chats.findIndex((chat) => chat.id === action.payload.id)) {
        state.chats.push(action.payload);
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
  addRoute,
  addMessage,
  ackMessage,
  updateLastInteraction,
  setHostOverrideEnabled,
  setHostOverride,
  resetState,
} = meshtasticSlice.actions;

export default meshtasticSlice.reducer;
