import type { ConversationKey } from "./MessageRepository.ts";

/**
 * Persists per-conversation draft text. Implementations can be in-memory
 * (lost on reload) or backed by SQLite for users who expect drafts to
 * survive a refresh.
 */
export interface DraftRepository {
  load(key: ConversationKey): Promise<string>;
  save(key: ConversationKey, text: string): Promise<void>;
  clear(key: ConversationKey): Promise<void>;
  loadAll(): Promise<ReadonlyArray<{ key: ConversationKey; text: string }>>;
}
