import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { produce } from 'immer';
import { Types } from '@meshtastic/core';
import { zustandIndexDBStorage } from "@core/services/messaging/db.ts";

const MESSAGE_STATES = {
  ack: "ack",
  waiting: "waiting",
  failed: 'failed',
};
export type MessageState = keyof typeof MESSAGE_STATES;

export const ChatTypes = {
  DIRECT: "direct",
  BROADCAST: "broadcast",
} as const;

export type MessageType = "broadcast" | "direct";

interface MessageBase {
  channel: Types.ChannelNumber;
  to: number;
  from: number;
  date: string;
  messageId: number;
  state: MessageState;
  message: string;
}

interface GenericMessage<T extends MessageType> extends MessageBase {
  type: T;
}

export type Message = GenericMessage<'direct'> | GenericMessage<'broadcast'>;

export interface MessageStore {
  messages: {
    direct: Record<number, Record<number, Message>>; // node -> messageId -> Message
    broadcast: Record<number, Record<number, Message>>; // channel -> messageId -> Message
  };
  nodeNum: number;
  activeChat: number;
  chatType: MessageType;

  setNodeNum: (nodeNum: number) => void;
  getNodeNum: () => number;
  setActiveChat: (chat: number) => void;
  setChatType: (type: MessageType) => void;
  saveMessage: (message: Message) => void;
  setMessageState: (params: {
    type: MessageType;
    key: number;
    messageId: number;
    newState?: MessageState;
  }) => void;
  clearMessages: () => void;
  getMessages: (type: MessageType, options: { myNodeNum?: number; otherNodeNum?: number; channel?: number }) => Message[];
}

export const useMessageStore = create<MessageStore>()(
  persist(
    (set, get) => ({
      messages: {
        direct: {},
        broadcast: {},
      },
      activeChat: 0,
      chatType: 'broadcast',
      nodeNum: 0,
      setNodeNum: (nodeNum) => {
        set(produce((state: MessageStore) => {
          state.nodeNum = nodeNum;
        }));
      },

      getNodeNum: () => get().nodeNum,

      setActiveChat: (chat) => {
        set(produce((state: MessageStore) => {
          state.activeChat = chat;
        }));
      },

      setChatType: (type) => {
        set(produce((state: MessageStore) => {
          state.chatType = type;
        }));
      },

      saveMessage: (message) => {
        set(produce((state: MessageStore) => {
          const group = state.messages[message.type];
          const key = message.type === 'direct' ? Number(message.from) : Number(message.channel);

          if (!group[key]) {
            group[key] = {};
          }
          group[key][message.messageId] = message;
        }));
      },
      setMessageState: ({ type, key, messageId, newState = 'ack' }) => {
        set(produce((state: MessageStore) => {
          const group = state.messages[type];
          const messageMap = group[key];
          if (!messageMap || !messageMap[messageId]) return;
          messageMap[messageId].state = newState;
        }));
      },
      clearMessages: () => {
        set(produce((state: MessageStore) => {
          state.messages.direct = {};
          state.messages.broadcast = {};
        }));
      },
      getMessages: (type, options) => {
        const state = get();

        if (type === 'broadcast' && options.channel !== undefined) {
          const messageMap = state.messages.broadcast[options.channel] ?? {};
          return Object.values(messageMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        if (type === 'direct' && options.myNodeNum !== undefined && options.otherNodeNum !== undefined) {
          const receivedMap = state.messages.direct[options.otherNodeNum] ?? {};
          const sentMap = state.messages.direct[options.myNodeNum] ?? {};

          // Pull messages where I am the sender and otherNode is the receiver
          const sentMessages = Object.values(sentMap).filter(msg => msg.to === options.otherNodeNum);

          // Pull messages received from otherNode
          const receivedMessages = Object.values(receivedMap);

          // Merge and sort chronologically
          return [...receivedMessages, ...sentMessages].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
        }

        return [];
      },
    }),
    {
      name: 'meshtastic-message-store',
      storage: createJSONStorage(() => zustandIndexDBStorage),
      partialize: (state) => ({
        messages: state.messages,
      }),
    }
  )
);
