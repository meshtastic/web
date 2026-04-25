import { type ConversationKey, conversationKeyString } from "../../domain/MessageRepository.ts";
import type { DraftRepository } from "../../domain/DraftRepository.ts";

export class InMemoryDraftRepository implements DraftRepository {
  private readonly map = new Map<string, { key: ConversationKey; text: string }>();

  async load(key: ConversationKey): Promise<string> {
    return this.map.get(conversationKeyString(key))?.text ?? "";
  }

  async save(key: ConversationKey, text: string): Promise<void> {
    if (text.length === 0) {
      this.map.delete(conversationKeyString(key));
      return;
    }
    this.map.set(conversationKeyString(key), { key, text });
  }

  async clear(key: ConversationKey): Promise<void> {
    this.map.delete(conversationKeyString(key));
  }

  async loadAll(): Promise<ReadonlyArray<{ key: ConversationKey; text: string }>> {
    return Array.from(this.map.values());
  }
}
