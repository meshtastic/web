import type * as Protobuf from "@meshtastic/protobufs";
import type { Message } from "../../domain/Message.ts";
import {
  type MessageState,
  shouldApplyMessageStateUpdate,
} from "../../domain/MessageState.ts";
import {
  type ConversationKey,
  conversationKeyString,
  type MessageRepository,
  type RetentionPolicy,
} from "../../domain/MessageRepository.ts";

export interface InMemoryMessageRepositoryOptions {
  localNodeNum?: number | (() => number | undefined);
}

/**
 * Default in-memory MessageRepository. No persistence across reloads; useful
 * for tests and for single-session apps that do not need history.
 */
export class InMemoryMessageRepository implements MessageRepository {
  private readonly buckets = new Map<string, Message[]>();
  private readonly localNodeNum: InMemoryMessageRepositoryOptions["localNodeNum"];

  constructor(options: InMemoryMessageRepositoryOptions = {}) {
    this.localNodeNum = options.localNodeNum;
  }

  async loadRecent(key: ConversationKey, limit: number): Promise<Message[]> {
    const bucket = this.buckets.get(conversationKeyString(key)) ?? [];
    return bucket.slice(-limit);
  }

  async loadBefore(
    key: ConversationKey,
    cursor: Date,
    limit: number,
  ): Promise<Message[]> {
    const bucket = this.buckets.get(conversationKeyString(key)) ?? [];
    const idx = bucket.findIndex((m) => m.rxTime >= cursor);
    const end = idx === -1 ? bucket.length : idx;
    const start = Math.max(0, end - limit);
    return bucket.slice(start, end);
  }

  async append(message: Message, key?: ConversationKey): Promise<void> {
    this.appendToBucket(message, key);
  }

  async appendBatch(messages: ReadonlyArray<Message>): Promise<void> {
    for (const message of messages) {
      this.appendToBucket(message);
    }
  }

  async updateState(
    id: number,
    state: MessageState,
    routingError?: Protobuf.Mesh.Routing_Error,
  ): Promise<void> {
    for (const bucket of this.buckets.values()) {
      const idx = bucket.findIndex((m) => m.id === id);
      if (idx !== -1) {
        const existing = bucket[idx];
        if (!existing) continue;
        if (!shouldApplyMessageStateUpdate(existing.state, state)) return;
        if (
          existing.state === state &&
          existing.routingError === routingError
        ) {
          return;
        }
        bucket[idx] = { ...existing, state, routingError };
        return;
      }
    }
  }

  async delete(id: number): Promise<void> {
    for (const [key, bucket] of this.buckets) {
      const next = bucket.filter((message) => message.id !== id);
      if (next.length !== bucket.length) {
        this.buckets.set(key, next);
        return;
      }
    }
  }

  async prune(policy: RetentionPolicy): Promise<void> {
    const nowMs = Date.now();
    for (const [key, bucket] of this.buckets) {
      let filtered =
        policy.olderThanMs === undefined
          ? bucket
          : bucket.filter(
              (m) => nowMs - m.rxTime.getTime() <= policy.olderThanMs!,
            );
      if (
        policy.maxPerBucket !== undefined &&
        filtered.length > policy.maxPerBucket
      ) {
        filtered = filtered.slice(-policy.maxPerBucket);
      }
      this.buckets.set(key, filtered);
    }
  }

  async clearConversation(key: ConversationKey): Promise<void> {
    this.buckets.delete(conversationKeyString(key));
  }

  async clear(): Promise<void> {
    this.buckets.clear();
  }

  private appendToBucket(message: Message, key?: ConversationKey): void {
    const k = conversationKeyString(key ?? this.inferConversationKey(message));
    const bucket = this.buckets.get(k) ?? [];
    bucket.push(message);
    bucket.sort((a, b) => a.rxTime.getTime() - b.rxTime.getTime());
    this.buckets.set(k, bucket);
  }

  private inferConversationKey(message: Message): ConversationKey {
    if (message.type !== "direct") {
      return { kind: "channel", channel: message.channel };
    }

    const localNodeNum = this.resolveLocalNodeNum();
    return {
      kind: "direct",
      peer:
        localNodeNum !== undefined && message.from === localNodeNum
          ? message.to
          : message.from,
    };
  }

  private resolveLocalNodeNum(): number | undefined {
    return typeof this.localNodeNum === "function"
      ? this.localNodeNum()
      : this.localNodeNum;
  }
}
