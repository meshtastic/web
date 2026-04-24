import { type Signal, signal } from "@preact/signals-core";
import type { ReadonlySignal } from "../../../core/signals/createStore.ts";
import { toReadonly } from "../../../core/signals/createStore.ts";
import type { ChannelNumber } from "../../../core/types.ts";
import type { Message } from "../domain/Message.ts";
import { MessageState } from "../domain/MessageState.ts";

/**
 * Messages grouped by conversation bucket. Direct messages are keyed by
 * `direct:<peerNodeNum>`; broadcast messages by `channel:<channelNumber>`.
 */
export class ChatStore {
  private readonly buckets = new Map<string, Signal<Message[]>>();
  private readonly readBuckets = new Map<string, ReadonlySignal<Message[]>>();

  channelKey(channel: ChannelNumber): string {
    return `channel:${channel}`;
  }

  directKey(peer: number): string {
    return `direct:${peer}`;
  }

  messagesForChannel(channel: ChannelNumber): ReadonlySignal<Message[]> {
    return this.readBucket(this.channelKey(channel));
  }

  messagesForDirect(peer: number): ReadonlySignal<Message[]> {
    return this.readBucket(this.directKey(peer));
  }

  append(key: string, message: Message): void {
    const bucket = this.writeBucket(key);
    bucket.value = [...bucket.value, message];
  }

  /**
   * Inserts an older message at the front of the bucket. Used when paginating
   * backwards; preserves chronological order because callers feed older-first.
   */
  prepend(key: string, message: Message): void {
    const bucket = this.writeBucket(key);
    bucket.value = [message, ...bucket.value];
  }

  updateState(id: number, state: MessageState): void {
    for (const [, bucket] of this.buckets) {
      const idx = bucket.value.findIndex((m) => m.id === id);
      if (idx !== -1) {
        const next = bucket.value.slice();
        const existing = next[idx];
        if (!existing) continue;
        next[idx] = { ...existing, state };
        bucket.value = next;
        return;
      }
    }
  }

  private writeBucket(key: string): Signal<Message[]> {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = signal<Message[]>([]);
      this.buckets.set(key, bucket);
      this.readBuckets.set(key, toReadonly(bucket));
    }
    return bucket;
  }

  private readBucket(key: string): ReadonlySignal<Message[]> {
    this.writeBucket(key);
    const read = this.readBuckets.get(key);
    if (!read) throw new Error("unreachable");
    return read;
  }
}
