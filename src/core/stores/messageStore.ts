import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { produce } from 'immer';
import { Types } from '@meshtastic/core';
import { zustandIDBStorage } from "@core/services/messaging/db.ts";

export interface MessageWithState {
  id: number;
  from: number;
  to: number;
  channel: number;
  content: string;
  state: 'ack' | 'waiting' | 'failed';
  type: 'direct' | 'broadcast';
}

type MessageType = 'direct' | 'broadcast';

export interface MessageStore {
  messages: {
    direct: Record<number, MessageWithState[]>;
    broadcast: Record<number, MessageWithState[]>;
  };

  activeChat: number;
  chatType: MessageType;

  setActiveChat: (chat: number) => void;
  setChatType: (type: MessageType) => void;
  addMessage: (message: MessageWithState) => void;
  getMessages: (type: MessageType, key: number) => MessageWithState[];
  setMessageState: (
    type: MessageType,
    key: number,
    messageId: number,
    newState: MessageWithState['state']
  ) => void;
  clearMessages: () => void;
}

export const useMessageStore = create<MessageStore>()(
  persist(
    (set, get) => ({
      messages: {
        direct: {},
        broadcast: {},
      },

      activeChat: Types.ChannelNumber.Primary,
      chatType: 'broadcast',

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

      addMessage: (message) => {
        set(produce((state: MessageStore) => {
          const group = message.type === 'direct' ? state.messages.direct : state.messages.broadcast;
          const key = message.type === 'direct' ? message.from : message.channel;
          if (!group[key]) {
            group[key] = [];
          }
          group[key].push(message);
        }));
      },

      getMessages: (type, key) => {
        const group = type === 'direct' ? get().messages.direct : get().messages.broadcast;
        return group[key] ?? [];
      },

      setMessageState: (type, key, messageId, newState) => {
        set(produce((state: MessageStore) => {
          const group = type === 'direct' ? state.messages.direct : state.messages.broadcast;
          const messages = group[key];
          if (!messages) return;
          const message = messages.find((msg) => msg.id === messageId);
          if (message) {
            message.state = newState;
          }
        }));
      },

      clearMessages: () => {
        set(produce((state: MessageStore) => {
          state.messages.direct = {};
          state.messages.broadcast = {};
        }));
      },
    }),
    {
      name: 'mesh-messages',
      storage: createJSONStorage(() => zustandIDBStorage),
      // ✅ No need for partialize magic — simple object storage
      partialize: (state) => ({
        activeChat: state.activeChat,
        chatType: state.chatType,
        messages: state.messages,
      }),
    }
  )
);
