import type { Message } from "../../domain/Message.ts";
import type { MessageState } from "../../domain/MessageState.ts";
import {
  type ConversationKey,
  conversationKeyString,
  type MessageRepository,
  type RetentionPolicy,
} from "../../domain/MessageRepository.ts";

/**
 * Default in-memory MessageRepository. No persistence across reloads; useful
 * for tests and for single-session apps that do not need history.
 */
export class InMemoryMessageRepository implements MessageRepository {
  private readonly buckets = new Map<string, Message[]>();

  async loadRecent(key: ConversationKey, limit: number): Promise<Message[]> {
    const bucket = this.buckets.get(conversationKeyString(key)) ?? [];
    return bucket.slice(-limit);
  }

  async loadBefore(key: ConversationKey, cursor: Date, limit: number): Promise<Message[]> {
    const bucket = this.buckets.get(conversationKeyString(key)) ?? [];
    const idx = bucket.findIndex((m) => m.rxTime >= cursor);
    const end = idx === -1 ? bucket.length : idx;
    const start = Math.max(0, end - limit);
    return bucket.slice(start, end);
  }

  async append(message: Message): Promise<void> {
    await this.appendBatch([message]);
  }

  async appendBatch(messages: ReadonlyArray<Message>): Promise<void> {
    for (const message of messages) {
      const k = this.inferKey(message);
      const bucket = this.buckets.get(k) ?? [];
      bucket.push(message);
      bucket.sort((a, b) => a.rxTime.getTime() - b.rxTime.getTime());
      this.buckets.set(k, bucket);
    }
  }

  async updateState(id: number, state: MessageState): Promise<void> {
    for (const bucket of this.buckets.values()) {
      const idx = bucket.findIndex((m) => m.id === id);
      if (idx !== -1) {
        const existing = bucket[idx];
        if (!existing) continue;
        bucket[idx] = { ...existing, state };
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
          : bucket.filter((m) => nowMs - m.rxTime.getTime() <= policy.olderThanMs!);
      if (policy.maxPerBucket !== undefined && filtered.length > policy.maxPerBucket) {
        filtered = filtered.slice(-policy.maxPerBucket);
      }
      this.buckets.set(key, filtered);
    }
  }

  async clear(): Promise<void> {
    this.buckets.clear();
  }

  private inferKey(message: Message): string {
    return message.type === "direct"
      ? conversationKeyString({ kind: "direct", peer: message.from })
      : conversationKeyString({ kind: "channel", channel: message.channel });
  }
}
