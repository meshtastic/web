import { featureFlags } from "@core/services/featureFlags";
import type {
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
import { evictOldestEntries } from "@core/stores/utils/evictOldestEntries.ts";
import { createStorage } from "@core/stores/utils/indexDB.ts";
import type { Types } from "@meshtastic/core";
import { produce } from "immer";
import { create as createStore, type StateCreator } from "zustand";
import { type PersistOptions, persist } from "zustand/middleware";

const IDB_KEY_NAME = "meshtastic-message-store";
const CURRENT_STORE_VERSION = 0;
const MESSAGESTORE_RETENTION_NUM = 10;
const MESSAGELOG_RETENTION_NUM = 1000; // Max messages per conversation/channel

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

export interface MessageBuckets {
  direct: Map<ConversationId, MessageLogMap>;
  broadcast: Map<ChannelId, MessageLogMap>;
}

type MessageStoreData = {
  // Persisted data
  id: number;
  myNodeNum: number | undefined;
  messages: MessageBuckets;
  drafts: Map<Types.Destination, string>;
};

export interface MessageStore extends MessageStoreData {
  // Ephemeral state (not persisted)
  activeChat: number;
  chatType: MessageType;

  setNodeNum: (nodeNum: number) => void;
  saveMessage: (message: Message) => void;
  setMessageState: (params: SetMessageStateParams) => void;
  getMessages: (params: GetMessagesParams) => Message[];

  getDraft: (key: Types.Destination) => string;
  setDraft: (key: Types.Destination, message: string) => void;
  clearDraft: (key: Types.Destination) => void;
  //clearAllDrafts: (key: Types.Destination) => void;

  deleteAllMessages: () => void;
  clearMessageByMessageId: (params: ClearMessageParams) => void;
}

export interface MessageStoreState {
  addMessageStore: (id: number) => MessageStore;
  removeMessageStore: (id: number) => void;
  getMessageStore: (id: number) => MessageStore | undefined;
  getMessageStores: () => MessageStore[];
}
interface PrivateMessageStoreState extends MessageStoreState {
  messageStores: Map<number, MessageStore>;
}

type MessageStorePersisted = {
  messageStores: Map<number, MessageStoreData>;
};

function messageStoreFactory(
  id: number,
  get: () => PrivateMessageStoreState,
  set: typeof useMessageStore.setState,
  data?: Partial<MessageStoreData>,
): MessageStore {
  const messages = data?.messages ?? {
    direct: new Map<ConversationId, MessageLogMap>(),
    broadcast: new Map<ChannelId, MessageLogMap>(),
  };
  const drafts = data?.drafts ?? new Map<Types.Destination, string>();
  const myNodeNum = data?.myNodeNum;
  const activeChat = 0;
  const chatType = MessageType.Broadcast;

  return {
    id,
    myNodeNum,
    messages,
    drafts,
    activeChat,
    chatType,

    setNodeNum: (nodeNum) => {
      set(
        produce<PrivateMessageStoreState>((draft) => {
          const newStore = draft.messageStores.get(id);
          if (!newStore) {
            throw new Error(`No MessageStore found for id: ${id}`);
          }

          newStore.myNodeNum = nodeNum;

          for (const [otherId, oldStore] of draft.messageStores) {
            if (otherId === id || oldStore.myNodeNum !== nodeNum) {
              continue;
            }

            // Adopt broadcast conversations (reuses inner Map references)
            for (const [channelId, logMap] of oldStore.messages.broadcast) {
              newStore.messages.broadcast.set(channelId, logMap);
            }

            // Adopt direct conversations
            for (const [conversationId, logMap] of oldStore.messages.direct) {
              newStore.messages.direct.set(conversationId, logMap);
            }

            // Adopt drafts
            for (const [destination, draftText] of oldStore.drafts) {
              newStore.drafts.set(destination, draftText);
            }

            // Drop old store
            draft.messageStores.delete(otherId);
          }
        }),
      );
    },

    saveMessage: (message: Message) => {
      set(
        produce<PrivateMessageStoreState>((draft) => {
          const state = draft.messageStores.get(id);
          if (!state) {
            throw new Error(`No MessageStore found for id: ${id}`);
          }

          let log: MessageLogMap | undefined;
          if (message.type === MessageType.Direct) {
            const conversationId = getConversationId(message.from, message.to);
            if (!state.messages.direct.has(conversationId)) {
              state.messages.direct.set(
                conversationId,
                new Map<MessageId, Message>(),
              );
            }

            log = state.messages.direct.get(conversationId);
            log?.set(message.messageId, message);
          } else if (message.type === MessageType.Broadcast) {
            const channelId = message.channel as ChannelId;
            if (!state.messages.broadcast.has(channelId)) {
              state.messages.broadcast.set(
                channelId,
                new Map<MessageId, Message>(),
              );
            }

            log = state.messages.broadcast.get(channelId);
            log?.set(message.messageId, message);
          }

          if (log) {
            // Enforce retention limit
            evictOldestEntries(log, MESSAGELOG_RETENTION_NUM);
          }
        }),
      );
    },

    setMessageState: (params: SetMessageStateParams) => {
      set(
        produce<PrivateMessageStoreState>((draft) => {
          const state = draft.messageStores.get(id);
          if (!state) {
            throw new Error(`No MessageStore found for id: ${id}`);
          }

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
          } else {
            // Broadcast
            messageLog = state.messages.broadcast.get(params.channelId);
            if (messageLog) {
              targetMessage = messageLog.get(params.messageId);
            }
          }

          if (targetMessage) {
            targetMessage.state = params.newState ?? MessageState.Ack;
          } else {
            console.warn(
              `Message or conversation/channel not found for state update. Params: ${JSON.stringify(
                params,
              )}`,
            );
          }
        }),
      );
    },

    getMessages: (params: GetMessagesParams): Message[] => {
      const state = get().messageStores.get(id);
      if (!state) {
        throw new Error(`No MessageStore found for id: ${id}`);
      }

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

    getDraft: (key) => {
      const state = get().messageStores.get(id);
      if (!state) {
        throw new Error(`No MessageStore found for id: ${id}`);
      }

      return state.drafts.get(key) ?? "";
    },
    setDraft: (key, message) => {
      set(
        produce<PrivateMessageStoreState>((draft) => {
          const state = draft.messageStores.get(id);
          if (!state) {
            throw new Error(`No MessageStore found for id: ${id}`);
          }

          state.drafts.set(key, message);
        }),
      );
    },
    clearDraft: (key) => {
      set(
        produce<PrivateMessageStoreState>((draft) => {
          const state = draft.messageStores.get(id);
          if (!state) {
            throw new Error(`No MessageStore found for id: ${id}`);
          }

          state.drafts.delete(key);
        }),
      );
    },

    deleteAllMessages: () => {
      set(
        produce<PrivateMessageStoreState>((draft) => {
          const state = draft.messageStores.get(id);
          if (!state) {
            throw new Error(`No MessageStore found for id: ${id}`);
          }

          state.messages.direct = new Map<ConversationId, MessageLogMap>();
          state.messages.broadcast = new Map<ChannelId, MessageLogMap>();
        }),
      );
    },

    clearMessageByMessageId: (params: ClearMessageParams) => {
      set(
        produce<PrivateMessageStoreState>((draft) => {
          const state = draft.messageStores.get(id);
          if (!state) {
            throw new Error(`No MessageStore found for id: ${id}`);
          }

          let messageLog: MessageLogMap | undefined;
          let parentMap: Map<ConversationId | ChannelId, MessageLogMap>;
          let parentKey: ConversationId | ChannelId;

          if (params.type === MessageType.Direct) {
            parentKey = getConversationId(params.nodeA, params.nodeB);
            parentMap = state.messages.direct;
            messageLog = parentMap.get(parentKey);
          } else {
            // Broadcast
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
  };
}

export const messageStoreInitializer: StateCreator<PrivateMessageStoreState> = (
  set,
  get,
) => ({
  messageStores: new Map(),

  addMessageStore: (id) => {
    const existing = get().messageStores.get(id);
    if (existing) {
      return existing;
    }

    const nodeStore = messageStoreFactory(id, get, set);
    set(
      produce<PrivateMessageStoreState>((draft) => {
        draft.messageStores.set(id, nodeStore);

        // Enforce retention limit
        evictOldestEntries(draft.messageStores, MESSAGESTORE_RETENTION_NUM);
      }),
    );

    return nodeStore;
  },
  removeMessageStore: (id) => {
    set(
      produce<PrivateMessageStoreState>((draft) => {
        draft.messageStores.delete(id);
      }),
    );
  },
  getMessageStores: () => Array.from(get().messageStores.values()),
  getMessageStore: (id) => get().messageStores.get(id),
});

const persistOptions: PersistOptions<
  PrivateMessageStoreState,
  MessageStorePersisted
> = {
  name: IDB_KEY_NAME,
  storage: createStorage<MessageStorePersisted>(),
  version: CURRENT_STORE_VERSION,
  partialize: (s): MessageStorePersisted => ({
    messageStores: new Map(
      Array.from(s.messageStores.entries()).map(([id, db]) => [
        id,
        {
          id: db.id,
          myNodeNum: db.myNodeNum,
          messages: db.messages,
          drafts: db.drafts,
        },
      ]),
    ),
  }),
  onRehydrateStorage: () => (state) => {
    if (!state) {
      return;
    }
    console.debug(
      "MessageStoreStore: Rehydrating state with ",
      state.messageStores.size,
      " MessageStores -",
      state.messageStores,
    );

    useMessageStore.setState(
      produce<PrivateMessageStoreState>((draft) => {
        const rebuilt = new Map<number, MessageStore>();
        for (const [id, data] of (
          draft.messageStores as unknown as Map<number, MessageStoreData>
        ).entries()) {
          if (data.myNodeNum !== undefined) {
            // Only rebuild if there is a nodenum set otherwise orphan dbs will acumulate
            rebuilt.set(
              id,
              messageStoreFactory(
                id,
                useMessageStore.getState,
                useMessageStore.setState,
                data,
              ),
            );
          }
        }
        draft.messageStores = rebuilt;
      }),
    );
  },
};

// Add persist middleware on the store if the feature flag is enabled
const persistMessages = featureFlags.get("persistMessages");
console.debug(
  `MessageStore: Persisting messages is ${persistMessages ? "enabled" : "disabled"}`,
);

export const useMessageStore = persistMessages
  ? createStore<
      PrivateMessageStoreState,
      [["zustand/persist", MessageStorePersisted]]
    >(persist(messageStoreInitializer, persistOptions))
  : createStore<PrivateMessageStoreState>()(messageStoreInitializer);
