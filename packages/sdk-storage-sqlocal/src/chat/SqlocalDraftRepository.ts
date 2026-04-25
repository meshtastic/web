import type { ConversationKey, DraftRepository } from "@meshtastic/sdk";
import { conversationKeyString } from "@meshtastic/sdk";
import { and, eq, sql } from "drizzle-orm";
import type { SqlocalDb } from "../db.ts";
import { drafts } from "../schema/drafts.ts";

export interface SqlocalDraftRepositoryOptions {
  deviceId: number;
}

/**
 * Per-conversation draft persistence. Single row per (device_id,
 * conversation_key); upsert on save, delete on clear or empty save.
 */
export class SqlocalDraftRepository implements DraftRepository {
  private readonly db: SqlocalDb;
  private readonly deviceId: number;

  constructor(db: SqlocalDb, options: SqlocalDraftRepositoryOptions) {
    this.db = db;
    this.deviceId = options.deviceId;
  }

  async load(key: ConversationKey): Promise<string> {
    const rows = await this.db
      .select({ text: drafts.text })
      .from(drafts)
      .where(
        and(
          eq(drafts.deviceId, this.deviceId),
          eq(drafts.conversationKey, conversationKeyString(key)),
        )!,
      )
      .limit(1);
    return rows[0]?.text ?? "";
  }

  async save(key: ConversationKey, text: string): Promise<void> {
    if (text.length === 0) {
      await this.clear(key);
      return;
    }
    await this.db
      .insert(drafts)
      .values({
        deviceId: this.deviceId,
        conversationKey: conversationKeyString(key),
        text,
        updatedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: [drafts.deviceId, drafts.conversationKey],
        set: { text: sql`excluded.text`, updatedAt: sql`excluded.updated_at` },
      });
  }

  async clear(key: ConversationKey): Promise<void> {
    await this.db
      .delete(drafts)
      .where(
        and(
          eq(drafts.deviceId, this.deviceId),
          eq(drafts.conversationKey, conversationKeyString(key)),
        )!,
      );
  }

  async loadAll(): Promise<ReadonlyArray<{ key: ConversationKey; text: string }>> {
    const rows = await this.db
      .select({ conversationKey: drafts.conversationKey, text: drafts.text })
      .from(drafts)
      .where(eq(drafts.deviceId, this.deviceId));
    return rows.map((r) => ({ key: parseKey(r.conversationKey), text: r.text }));
  }
}

function parseKey(s: string): ConversationKey {
  if (s.startsWith("channel:")) return { kind: "channel", channel: Number(s.slice(8)) };
  if (s.startsWith("direct:")) return { kind: "direct", peer: Number(s.slice(7)) };
  throw new Error(`Unknown conversation key format: ${s}`);
}
