import type { ConversationKey, Message, MessageRepository, RetentionPolicy } from "@meshtastic/sdk";
import { conversationKeyString, MessageState } from "@meshtastic/sdk";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { type MultiTabCoordinator } from "../coordination/MultiTabCoordinator.ts";
import type { SqlocalDb } from "../db.ts";
import { messages } from "../schema/chat.ts";

export interface SqlocalMessageRepositoryOptions {
  /** Identifies the device (matches MeshRegistry ConnectionId). */
  deviceId: number;
  /** Optional cross-tab coordinator. If omitted, mutations are silent. */
  coordinator?: MultiTabCoordinator;
}

export class SqlocalMessageRepository implements MessageRepository {
  private readonly db: SqlocalDb;
  private readonly deviceId: number;
  private readonly coordinator: MultiTabCoordinator | undefined;

  constructor(db: SqlocalDb, options: SqlocalMessageRepositoryOptions) {
    this.db = db;
    this.deviceId = options.deviceId;
    this.coordinator = options.coordinator;
  }

  async loadRecent(key: ConversationKey, limit: number): Promise<Message[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(this.scoped(key))
      .orderBy(desc(messages.rxTime))
      .limit(limit);
    return rows.reverse().map(rowToMessage);
  }

  async loadBefore(key: ConversationKey, cursor: Date, limit: number): Promise<Message[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(and(this.scoped(key), lt(messages.rxTime, cursor.getTime()))!)
      .orderBy(desc(messages.rxTime))
      .limit(limit);
    return rows.reverse().map(rowToMessage);
  }

  async append(message: Message): Promise<void> {
    await this.appendBatch([message]);
  }

  async appendBatch(input: ReadonlyArray<Message>): Promise<void> {
    if (input.length === 0) return;
    const rows = input.map((m) => messageToRow(this.deviceId, m));
    await this.db.insert(messages).values(rows).onConflictDoNothing();
    this.notify(input);
  }

  async updateState(id: number, state: MessageState): Promise<void> {
    await this.db
      .update(messages)
      .set({ state })
      .where(and(eq(messages.deviceId, this.deviceId), eq(messages.id, id))!);
  }

  async prune(policy: RetentionPolicy): Promise<void> {
    if (policy.olderThanMs !== undefined) {
      const cutoff = Date.now() - policy.olderThanMs;
      await this.db
        .delete(messages)
        .where(and(eq(messages.deviceId, this.deviceId), lt(messages.rxTime, cutoff))!);
    }
    if (policy.maxPerBucket !== undefined) {
      // Keep the newest N per (device, conversation_key). SQLite has no
      // straightforward per-group LIMIT, so use a windowed delete.
      await this.db.run(sql`
        DELETE FROM messages
        WHERE device_id = ${this.deviceId}
          AND rowid IN (
            SELECT rowid FROM (
              SELECT rowid,
                     row_number() OVER (
                       PARTITION BY conversation_key
                       ORDER BY rx_time DESC, id DESC
                     ) AS rn
              FROM messages
              WHERE device_id = ${this.deviceId}
            )
            WHERE rn > ${policy.maxPerBucket}
          )
      `);
    }
  }

  async clearConversation(key: ConversationKey): Promise<void> {
    await this.db.delete(messages).where(this.scoped(key));
  }

  async clear(): Promise<void> {
    await this.db.delete(messages).where(eq(messages.deviceId, this.deviceId));
  }

  private scoped(key: ConversationKey) {
    return and(
      eq(messages.deviceId, this.deviceId),
      eq(messages.conversationKey, conversationKeyString(key)),
    )!;
  }

  private notify(input: ReadonlyArray<Message>): void {
    if (!this.coordinator) return;
    const seen = new Set<string>();
    for (const m of input) {
      const conv: ConversationKey =
        m.type === "direct"
          ? { kind: "direct", peer: m.from }
          : { kind: "channel", channel: m.channel };
      const key = conversationKeyString(conv);
      if (seen.has(key)) continue;
      seen.add(key);
      this.coordinator.broadcast({
        kind: "messages-changed",
        deviceId: this.deviceId,
        key,
      });
    }
  }
}

interface MessageRow {
  id: number;
  deviceId: number;
  conversationKey: string;
  fromNode: number;
  toNode: number;
  channel: number;
  rxTime: number;
  type: "broadcast" | "direct";
  text: string;
  state: "pending" | "ack" | "failed";
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    from: row.fromNode,
    to: row.toNode,
    channel: row.channel,
    rxTime: new Date(row.rxTime),
    type: row.type,
    text: row.text,
    state: row.state as MessageState,
  };
}

function messageToRow(deviceId: number, message: Message): MessageRow {
  const conv: ConversationKey =
    message.type === "direct"
      ? { kind: "direct", peer: message.from }
      : { kind: "channel", channel: message.channel };
  return {
    id: message.id,
    deviceId,
    conversationKey: conversationKeyString(conv),
    fromNode: message.from,
    toNode: message.to,
    channel: message.channel,
    rxTime: message.rxTime.getTime(),
    type: message.type,
    text: message.text,
    state: message.state,
  };
}
