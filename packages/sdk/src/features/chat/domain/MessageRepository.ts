import type { ChannelNumber } from "../../../core/types.ts";
import type { Message } from "./Message.ts";
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
  loadBefore(key: ConversationKey, cursor: Date, limit: number): Promise<Message[]>;
  append(message: Message): Promise<void>;
  appendBatch(messages: ReadonlyArray<Message>): Promise<void>;
  updateState(id: number, state: MessageState): Promise<void>;
  prune(policy: RetentionPolicy): Promise<void>;
  clear(): Promise<void>;
}

export function conversationKeyString(key: ConversationKey): string {
  return key.kind === "channel" ? `channel:${key.channel}` : `direct:${key.peer}`;
}
