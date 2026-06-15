import { type Signal, signal } from "@preact/signals-core";
import { type ReadonlySignal, toReadonly } from "../../../core/signals/createStore.ts";
import { type ConversationKey, conversationKeyString } from "../domain/MessageRepository.ts";

/**
 * Per-conversation draft text exposed as readonly signals. Lazy creation:
 * a signal is only allocated when a consumer subscribes to that
 * conversation's draft.
 */
export class DraftStore {
  private readonly buckets = new Map<string, Signal<string>>();
  private readonly read = new Map<string, ReadonlySignal<string>>();

  get(key: ConversationKey): ReadonlySignal<string> {
    const k = conversationKeyString(key);
    this.ensure(k);
    return this.read.get(k)!;
  }

  set(key: ConversationKey, text: string): void {
    const k = conversationKeyString(key);
    this.ensure(k).value = text;
  }

  clear(key: ConversationKey): void {
    const k = conversationKeyString(key);
    this.ensure(k).value = "";
  }

  private ensure(k: string): Signal<string> {
    let bucket = this.buckets.get(k);
    if (!bucket) {
      bucket = signal("");
      this.buckets.set(k, bucket);
      this.read.set(k, toReadonly(bucket));
    }
    return bucket;
  }
}
