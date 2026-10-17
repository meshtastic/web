import type { ChannelNumber } from "../../../core/types.ts";
import type { Message, MessageDeliveryPatch } from "./Message.ts";
import type { MessageState } from "./MessageState.ts";

/**
 * Conversation key. Broadcast messages are keyed by channel; direct messages
 * are keyed by the peer node number.
 */
export type ConversationKey =
  | { kind: "channel"; channel: ChannelNumber }
  | { kind: "direct"; peer: number };

export interface RetentionPolicy {
  /** Drop anything older than this many ms. */
  olderThanMs?: number;
  /** Keep at most this many messages per conversation. */
  maxPerBucket?: number;
}

/**
 * Port for persisting chat messages. Implementations live in adapter packages
 * (e.g. `@meshtastic/sdk-storage-sqlocal`) or in-memory within the SDK itself.
 *
 * Reads are paginated so consumers can lazy-load history on scroll rather than
 * rehydrating every message at boot.
 */
export interface MessageRepository {
  loadRecent(key: ConversationKey, limit: number): Promise<Message[]>;
  loadBefore(
    key: ConversationKey,
    cursor: Date,
    limit: number,
  ): Promise<Message[]>;
  /**
   * Stores a message. Pass `key` whenever it is known: a direct message we
   * sent belongs to its recipient, which `message` alone can't tell apart
   * from one we received. Without it the key is inferred from the sender.
   */
  append(message: Message, key?: ConversationKey): Promise<void>;
  /** Stores received messages, inferring each one's conversation. */
  appendBatch(messages: ReadonlyArray<Message>): Promise<void>;
  updateState(id: number, state: MessageState): Promise<void>;
  updateDelivery(id: number, patch: MessageDeliveryPatch): Promise<void>;
  /** Deletes one message, e.g. a failed one the user resends. */
  remove(id: number): Promise<void>;
  prune(policy: RetentionPolicy): Promise<void>;
  /** Deletes every message in a single conversation. */
  clearConversation(key: ConversationKey): Promise<void>;
  /** Deletes every message for the scoped device / consumer. */
  clear(): Promise<void>;
  /**
   * Moves direct messages we sent that were filed under our own node, as
   * older versions did, to the conversation with their recipient. Resolves
   * with how many moved.
   */
  refileSentDirect?(localNodeNum: number): Promise<number>;
}

/**
 * The conversation a received message belongs to. Wrong for a direct
 * message we sent, which belongs to its recipient; callers that know the
 * local node pass the key instead.
 */
export function inferConversation(message: Message): ConversationKey {
  return message.type === "direct"
    ? { kind: "direct", peer: message.from }
    : { kind: "channel", channel: message.channel };
}

export function conversationKeyString(key: ConversationKey): string {
  return key.kind === "channel"
    ? `channel:${key.channel}`
    : `direct:${key.peer}`;
}
