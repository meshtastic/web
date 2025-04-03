import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { produce } from 'immer';
import { Types } from '@meshtastic/core';
import { zustandIndexDBStorage } from "./storage/indexDB.ts";

export enum MessageState {
  Ack = "ack",
  Waiting = "waiting",
  Failed = "failed",
}

export enum MessageType {
  Direct = "direct",
  Broadcast = "broadcast",
}

interface MessageBase {
  channel: Types.ChannelNumber;
  to: number;
  from: number;
  date: number;
  messageId: number;
  state: MessageState;
  message: string;
}

interface GenericMessage<T extends MessageType> extends MessageBase {
  type: T;
}

export type Message = GenericMessage<MessageType.Direct> | GenericMessage<MessageType.Broadcast>;

export interface MessageStore {
  messages: {
    direct: Record<number, Record<number, Record<number, Message>>>;
    broadcast: Record<number, Record<number, Message>>; // channel -> messageId -> Message
  };
  draft: Map<Types.Destination, string>;
  nodeNum: number; // This device's node number
  activeChat: number; // Represents otherNodeNum for Direct, or channel for Broadcast
  chatType: MessageType;

  setNodeNum: (nodeNum: number) => void;
  getNodeNum: () => number;
  setActiveChat: (chat: number) => void;
  setChatType: (type: MessageType) => void;
  saveMessage: (message: Message) => void;
  setMessageState: (params: {
    type: MessageType;
    // For Direct: Represents the *other* node number involved in the chat.
    // For Broadcast: Represents the channel number.
    key: number;
    messageId: number;
    newState?: MessageState;
  }) => void;
  getMessages: (type: MessageType, options: { myNodeNum: number; otherNodeNum?: number; channel?: number }) => Message[];
  getDraft: (key: Types.Destination) => string;
  setDraft: (key: Types.Destination, message: string) => void;
  clearAllMessages: () => void;
  clearMessageByMessageId: (params: {
    type: MessageType;
    sender?: number;
    recipient?: number;
    channel?: number;
    messageId: number
  }) => void;
  clearDraft: (key: Types.Destination) => void;
}

const CURRENT_STORE_VERSION = 0;

export const useMessageStore = create<MessageStore>()(
  persist(
    (set, get) => ({
      messages: {
        direct: {}, // Record<sender, Record<recipient, Record<messageId, Message>>>
        broadcast: {},
      },
      draft: new Map<number, string>(),
      activeChat: 0,
      chatType: MessageType.Broadcast,
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
          if (message.type === MessageType.Direct) {
            const sender = Number(message.from);
            const recipient = Number(message.to);

            if (!state.messages.direct[sender]) {
              state.messages.direct[sender] = {};
            }
            if (!state.messages.direct[sender][recipient]) {
              state.messages.direct[sender][recipient] = {};
            }
            state.messages.direct[sender][recipient][message.messageId] = message;

          } else if (message.type === MessageType.Broadcast) {
            const channel = Number(message.channel);
            if (!state.messages.broadcast[channel]) {
              state.messages.broadcast[channel] = {};
            }
            state.messages.broadcast[channel][message.messageId] = message;
          }
        }));
      },
      setMessageState: ({
        type,
        key,
        messageId,
        newState = MessageState.Ack,
      }) => {
        set(
          produce((state: MessageStore) => {
            let message: Message | undefined;

            if (type === MessageType.Broadcast) {
              const channel = key;
              message = state.messages.broadcast?.[channel]?.[messageId];
            } else if (type === MessageType.Direct) {
              const otherNodeNum = key;
              const myNodeNum = state.nodeNum;

              message = state.messages.direct?.[myNodeNum]?.[otherNodeNum]?.[messageId];

              if (!message) {
                message = state.messages.direct?.[otherNodeNum]?.[myNodeNum]?.[messageId];
              }
            }

            if (message) {
              message.state = newState;
            } else {
              console.warn(`Message not found for state update - type: ${type}, key (otherNode/channel): ${key}, messageId: ${messageId}, myNodeNum: ${state.nodeNum}`);
            }
          }),
        );
      },
      getMessages: (type, options) => {
        const state = get();

        if (type === MessageType.Broadcast && options.channel !== undefined) {
          const messageMap = state.messages.broadcast[options.channel] ?? {};
          return Object.values(messageMap).sort((a, b) => a.date - b.date);
        }

        if (type === MessageType.Direct && options.myNodeNum !== undefined && options.otherNodeNum !== undefined) {
          const myNodeNum = options.myNodeNum;
          const otherNodeNum = options.otherNodeNum;

          // Messages sent BY ME TO OTHER
          const sentByMeMap = state.messages.direct?.[myNodeNum]?.[otherNodeNum] ?? {};
          const sentByMe = Object.values(sentByMeMap);

          // Messages sent BY OTHER TO ME
          const sentByOtherMap = state.messages.direct?.[otherNodeNum]?.[myNodeNum] ?? {};
          const sentByOther = Object.values(sentByOtherMap);

          // Merge and sort chronologically
          return [...sentByMe, ...sentByOther].sort((a, b) => a.date - b.date);
        }
        return [];
      },
      clearMessageByMessageId: ({ type, sender, recipient, channel, messageId }) => {
        set(produce((state: MessageStore) => {
          if (type === MessageType.Broadcast && channel !== undefined) {
            const messageMap = state.messages.broadcast[channel];
            if (messageMap?.[messageId]) {
              delete messageMap[messageId];
              if (Object.keys(messageMap).length === 0) {
                delete state.messages.broadcast[channel];
              }
            }
          } else if (type === MessageType.Direct && sender !== undefined && recipient !== undefined) {
            const messageMap = state.messages.direct?.[sender]?.[recipient];
            if (messageMap?.[messageId]) {
              delete messageMap[messageId];
              if (Object.keys(messageMap).length === 0) {
                delete state.messages.direct[sender][recipient];
                if (Object.keys(state.messages.direct[sender]).length === 0) {
                  delete state.messages.direct[sender];
                }
              }
            }
            console.warn("clearMessageByMessageId called without sufficient identifiers for type", type);
          }
        }));
      },
      getDraft: (key) => {
        return get().draft.get(key) ?? '';
      },
      setDraft: (key, message) => {
        set(produce((state: MessageStore) => {
          state.draft.set(key, message);
        }));
      },
      clearDraft: (key) => {
        set(produce((state: MessageStore) => {
          state.draft.delete(key);
        }));
      },
      clearAllMessages: () => {
        set(produce((state: MessageStore) => {
          state.messages.direct = {};
          state.messages.broadcast = {};
        }));
      }
    }),
    {
      name: 'meshtastic-message-store',
      storage: createJSONStorage(() => zustandIndexDBStorage),
      version: CURRENT_STORE_VERSION,
      partialize: (state) => ({
        messages: state.messages,
        nodeNum: state.nodeNum,
      }),
    }
  ));