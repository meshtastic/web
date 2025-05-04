import { create } from "zustand";
// import { persist } from "zustand/middleware";
import { produce } from "immer";
import { Types } from "@meshtastic/core";
// import { storageWithMapSupport } from "../storage/indexDB.ts";
import {
  ChannelId,
  ClearMessageParams,
  ConversationId,
  GetMessagesParams,
  Message,
  MessageId,
  MessageLogMap,
  NodeNum,
  SetMessageStateParams,
} from "@core/stores/messageStore/types.ts";

export enum MessageState {
  Ack = "ack",
  Waiting = "waiting",
  Failed = "failed",
}

export enum MessageType {
  Direct = "direct",
  Broadcast = "broadcast",
}

export function getConversationId(
  node1: NodeNum,
  node2: NodeNum,
): ConversationId {
  return [node1, node2].sort((a, b) => a - b).join(":");
}

export interface MessageStore {
  messages: {
    direct: Map<ConversationId, MessageLogMap>;
    broadcast: Map<ChannelId, MessageLogMap>;
  };
}
export interface MessageStore {
  messages: MessageStore["messages"];
  draft: Map<Types.Destination, string>;
  nodeNum: number; // This device's node number
  activeChat: number; // Represents otherNodeNum for Direct, or channel for Broadcast
  chatType: MessageType;

  setNodeNum: (nodeNum: number) => void;
  getMyNodeNum: () => number;
  setActiveChat: (chat: number) => void;
  setChatType: (type: MessageType) => void;
  saveMessage: (message: Message) => void;
  setMessageState: (params: SetMessageStateParams) => void;
  getMessages: (params: GetMessagesParams) => Message[];
  getDraft: (key: Types.Destination) => string;
  setDraft: (key: Types.Destination, message: string) => void;
  deleteAllMessages: () => void;
  clearMessageByMessageId: (params: ClearMessageParams) => void;
  clearDraft: (key: Types.Destination) => void;
}

// const CURRENT_STORE_VERSION = 0;

export const useMessageStore = create<MessageStore>()(
  // persist(
  (set, get) => ({
    messages: {
      direct: new Map<ConversationId, MessageLogMap>(),
      broadcast: new Map<ChannelId, MessageLogMap>(),
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
    getMyNodeNum: () => get().nodeNum,
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
    saveMessage: (message: Message) => {
      set(
        produce((state: MessageStore) => {
          if (message.type === MessageType.Direct) {
            const conversationId = getConversationId(message.from, message.to);
            if (!state.messages.direct.has(conversationId)) {
              state.messages.direct.set(
                conversationId,
                new Map<MessageId, Message>(),
              );
            }
            state.messages.direct.get(conversationId)!.set(
              message.messageId,
              message,
            );
          } else if (message.type === MessageType.Broadcast) {
            const channelId = message.channel as ChannelId;
            if (!state.messages.broadcast.has(channelId)) {
              state.messages.broadcast.set(
                channelId,
                new Map<MessageId, Message>(),
              );
            }
            state.messages.broadcast.get(channelId)!.set(
              message.messageId,
              message,
            );
          }
        }),
      );
    },

    setMessageState: (params: SetMessageStateParams) => {
      set(
        produce((state: MessageStore) => {
          let messageLog: MessageLogMap | undefined;
          let targetMessage: Message | undefined;

          if (params.type === MessageType.Direct) {
            const conversationId = getConversationId(
              params.nodeA,
              params.nodeB,
            );
            messageLog = state.messages.direct.get(conversationId);
            if (messageLog) {
              targetMessage = messageLog.get(params.messageId);
            }
          } else { // Broadcast
            messageLog = state.messages.broadcast.get(params.channelId);
            if (messageLog) {
              targetMessage = messageLog.get(params.messageId);
            }
          }

          if (targetMessage) {
            targetMessage.state = params.newState ?? MessageState.Ack;
          } else {
            console.warn(
              `Message or conversation/channel not found for state update. Params: ${
                JSON.stringify(params)
              }`,
            );
          }
        }),
      );
    },
    getMessages: (params: GetMessagesParams): Message[] => {
      const state = get();
      let messageMap: MessageLogMap | undefined;

      if (params.type === MessageType.Direct) {
        const conversationId = getConversationId(params.nodeA, params.nodeB);
        messageMap = state.messages.direct.get(conversationId);
      } else {
        messageMap = state.messages.broadcast.get(params.channelId);
      }

      if (messageMap === undefined) {
        return [];
      }

      const messagesArray = Array.from(messageMap.values());
      messagesArray.sort((a, b) => a.date - b.date);
      return messagesArray;
    },

    clearMessageByMessageId: (params: ClearMessageParams) => {
      set(
        produce((state: MessageStore) => {
          let messageLog: MessageLogMap | undefined;
          let parentMap: Map<ConversationId | ChannelId, MessageLogMap>;
          let parentKey: ConversationId | ChannelId;

          if (params.type === MessageType.Direct) {
            parentKey = getConversationId(params.nodeA, params.nodeB);
            parentMap = state.messages.direct;
            messageLog = parentMap.get(parentKey);
          } else {
            parentKey = params.channelId;
            parentMap = state.messages.broadcast;
            messageLog = parentMap.get(parentKey);
          }

          if (messageLog) {
            const deleted = messageLog.delete(params.messageId);

            if (deleted) {
              console.log(
                `Deleted message ${params.messageId} from ${params.type} message ${parentKey}`,
              );
              // Clean up empty MessageLogMap and its entry in the parent map
              if (messageLog.size === 0) {
                parentMap.delete(parentKey);
                console.log(`Cleaned up empty message entry for ${parentKey}`);
              }
            } else {
              console.warn(
                `Message ${params.messageId} not found in ${params.type} chat ${parentKey} for deletion.`,
              );
            }
          } else {
            console.warn(
              `Message entry ${parentKey} not found for message deletion.`,
            );
          }
        }),
      );
    },
    getDraft: (key) => {
      return get().draft.get(key) ?? "";
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
    deleteAllMessages: () => {
      set(produce((state: MessageStore) => {
        state.messages.direct = new Map<ConversationId, MessageLogMap>();
        state.messages.broadcast = new Map<ChannelId, MessageLogMap>();
      }));
    },
  }),
  // {
  //   name: 'meshtastic-message-store',
  //   storage: storageWithMapSupport,
  //   version: CURRENT_STORE_VERSION,
  //   partialize: (state) => ({
  //     messages: state.messages,
  //     nodeNum: state.nodeNum,
  //   }),
  // })
);
