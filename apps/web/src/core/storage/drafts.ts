import { and, eq, sql } from "drizzle-orm";
import type { SqlocalDb } from "./db.ts";
import { drafts } from "./schema.ts";
import { type ScopeOptions, type StorageScope, scopeOf } from "./scope.ts";
import {
  type ConversationKey,
  conversationKeyString,
  type DraftRepository,
  parseConversationKey,
} from "./types.ts";

/** The `device_id` rows are stored and read under (see `StorageScope`). */
export type SqlocalDraftRepositoryOptions = ScopeOptions;

/**
 * Per-conversation draft persistence. Single row per (device_id,
 * conversation_key); upsert on save, delete on clear or empty save.
 */
export class SqlocalDraftRepository implements DraftRepository {
  private readonly db: SqlocalDb;
  private readonly scope: StorageScope;

  constructor(db: SqlocalDb, options: SqlocalDraftRepositoryOptions) {
    this.db = db;
    this.scope = scopeOf(options);
  }

  /**
   * Points every later read and write at another `device_id`. Rows under the
   * old one are left as they are.
   */
  setScope(deviceId: number): void {
    this.scope.set(deviceId);
  }

  load(key: ConversationKey): Promise<string> {
    return this.scope.run(async (deviceId) => {
      const rows = await this.db
        .select({ text: drafts.text })
        .from(drafts)
        .where(
          and(
            eq(drafts.deviceId, deviceId),
            eq(drafts.conversationKey, conversationKeyString(key)),
          ),
        )
        .limit(1);
      return rows[0]?.text ?? "";
    });
  }

  save(key: ConversationKey, text: string): Promise<void> {
    return this.scope.run(async (deviceId) => {
      if (text.length === 0) {
        await this.remove(deviceId, key);
        return;
      }
      await this.db
        .insert(drafts)
        .values({
          deviceId,
          conversationKey: conversationKeyString(key),
          text,
          updatedAt: Date.now(),
        })
        .onConflictDoUpdate({
          target: [drafts.deviceId, drafts.conversationKey],
          set: {
            text: sql`excluded.text`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
    });
  }

  clear(key: ConversationKey): Promise<void> {
    return this.scope.run((deviceId) => this.remove(deviceId, key));
  }

  private async remove(deviceId: number, key: ConversationKey): Promise<void> {
    await this.db
      .delete(drafts)
      .where(
        and(
          eq(drafts.deviceId, deviceId),
          eq(drafts.conversationKey, conversationKeyString(key)),
        ),
      );
  }

  loadAll(): Promise<ReadonlyArray<{ key: ConversationKey; text: string }>> {
    return this.scope.run(async (deviceId) => {
      const rows = await this.db
        .select({ conversationKey: drafts.conversationKey, text: drafts.text })
        .from(drafts)
        .where(eq(drafts.deviceId, deviceId));
      return rows.map((r) => ({
        key: parseConversationKey(r.conversationKey),
        text: r.text,
      }));
    });
  }
}
