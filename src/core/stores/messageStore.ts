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
  date: number; // Unix timestamp in milliseconds
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
    direct: Record<number, Record<number, Message>>; // other_node_num -> messageId -> Message
    broadcast: Record<number, Record<number, Message>>; // channel -> messageId -> Message
  };
  draft: Map<Types.Destination, string>;
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
  getMessages: (type: MessageType, options: { myNodeNum?: number; otherNodeNum?: number; channel?: number }) => Message[];
  getDraft: (key: Types.Destination) => string;
  setDraft: (key: Types.Destination, message: string) => void;
  clearAllMessages: () => void;
  clearMessageByMessageId: (type: MessageType, messageId: number) => void;
  clearDraft: (key: Types.Destination) => void;

}

export const useMessageStore = create<MessageStore>()(
  persist(
    (set, get) => ({
      messages: {
        direct: {},
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
          const group = state.messages[message.type];
          // Direct messages are keyed by the RECIPIENT's node number (`message.to`)
          // Broadcast messages are keyed by the channel number (`message.channel`)
          const key = message.type === MessageType.Direct ? Number(message.to) : Number(message.channel);
          if (!group[key]) {
            group[key] = {};
          }
          const messageToSave = { ...message };
          group[key][message.messageId] = messageToSave;
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
            const message = state.messages[type]?.[key]?.[messageId];
            if (message) {
              message.state = newState;
            } else {
              console.warn(`Message not found - type: ${type}, key: ${key}, messageId: ${messageId}`);
            }
          }),
        );
      },
      clearMessages: () => {
        set(produce((state: MessageStore) => {
          state.messages.direct = {};
          state.messages.broadcast = {};
        }));
      },
      getMessages: (type, options) => {
        const state = get();

        if (type === MessageType.Broadcast && options.channel !== undefined) {
          const messageMap = state.messages.broadcast[options.channel] ?? {};
          return Object.values(messageMap).sort((a, b) => a.date - b.date);
        }

        if (type === MessageType.Direct && options.myNodeNum !== undefined && options.otherNodeNum !== undefined) {
          // Messages TO the other node (sent by me) are keyed under their nodeNum
          const messagesToOtherNodeMap = state.messages.direct[options.otherNodeNum] ?? {};
          const sentByMe = Object.values(messagesToOtherNodeMap);

          // Messages TO me (potentially from the other node) are keyed under my nodeNum
          const messagesToMeMap = state.messages.direct[options.myNodeNum] ?? {};
          // Filter messages TO me to find the ones FROM the specific other node
          const sentByOtherNode = Object.values(messagesToMeMap).filter(
            (msg) => msg.from === options.otherNodeNum
          );

          // Merge and sort chronologically
          return [...sentByMe, ...sentByOtherNode].sort(
            (a, b) => a.date - b.date
          );
        }

        return [];
      },
      getDraft: (key) => {
        return get().draft.get(key) ?? '';
      },
      setDraft: (key, message) => {
        set(produce((state: MessageStore) => {
          state.draft.set(key, message);
        }));
      },
      clearMessageByMessageId: (type, messageId) => {
        set(produce((state: MessageStore) => {
          const group = state.messages[type];
          for (const key in group) {
            if (group[key][messageId]) {
              delete group[key][messageId];
              if (Object.keys(group[key]).length === 0) {
                delete group[key];
              }
              break;
            }
          }
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
      partialize: (state) => ({
        messages: state.messages,
      }),
    }
  )
);
