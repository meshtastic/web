import type * as Protobuf from "@meshtastic/protobufs";
import type {
  ConversationKey,
  Message,
  MessageRepository,
  RetentionPolicy,
} from "@meshtastic/sdk";
import { conversationKeyString, MessageState } from "@meshtastic/sdk";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { type MultiTabCoordinator } from "../coordination/MultiTabCoordinator.ts";
import type { SqlocalDb } from "../db.ts";
import { messages } from "../schema/chat.ts";

export interface SqlocalMessageRepositoryOptions {
  /** Identifies the device (matches MeshRegistry ConnectionId). */
  deviceId: number;
  /** Local node number, used when appending direct messages without a key. */
  localNodeNum?: number | (() => number | undefined);
  /** Optional cross-tab coordinator. If omitted, mutations are silent. */
  coordinator?: MultiTabCoordinator;
}

export class SqlocalMessageRepository implements MessageRepository {
  private readonly db: SqlocalDb;
  private readonly deviceId: number;
  private readonly localNodeNum: SqlocalMessageRepositoryOptions["localNodeNum"];
  private readonly coordinator: MultiTabCoordinator | undefined;

  constructor(db: SqlocalDb, options: SqlocalMessageRepositoryOptions) {
    this.db = db;
    this.deviceId = options.deviceId;
    this.localNodeNum = options.localNodeNum;
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

  async loadBefore(
    key: ConversationKey,
    cursor: Date,
    limit: number,
  ): Promise<Message[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(and(this.scoped(key), lt(messages.rxTime, cursor.getTime()))!)
      .orderBy(desc(messages.rxTime))
      .limit(limit);
    return rows.reverse().map(rowToMessage);
  }

  async append(message: Message, key?: ConversationKey): Promise<void> {
    const conversation = key ?? this.inferConversationKey(message);
    await this.insertEntries([{ message, conversation }]);
  }

  async appendBatch(input: ReadonlyArray<Message>): Promise<void> {
    if (input.length === 0) return;
    await this.insertEntries(
      input.map((message) => ({
        message,
        conversation: this.inferConversationKey(message),
      })),
    );
  }

  async updateState(
    id: number,
    state: MessageState,
    routingError?: Protobuf.Mesh.Routing_Error,
  ): Promise<void> {
    await this.db
      .update(messages)
      .set({ state, routingError: routingError ?? null })
      .where(and(eq(messages.deviceId, this.deviceId), eq(messages.id, id))!);
  }

  async prune(policy: RetentionPolicy): Promise<void> {
    if (policy.olderThanMs !== undefined) {
      const cutoff = Date.now() - policy.olderThanMs;
      await this.db
        .delete(messages)
        .where(
          and(
            eq(messages.deviceId, this.deviceId),
            lt(messages.rxTime, cutoff),
          )!,
        );
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

  private async insertEntries(
    entries: ReadonlyArray<{
      message: Message;
      conversation: ConversationKey;
    }>,
  ): Promise<void> {
    if (entries.length === 0) return;
    const rows = entries.map(({ message, conversation }) =>
      messageToRow(this.deviceId, message, conversation),
    );
    await this.db
      .insert(messages)
      .values(rows)
      .onConflictDoNothing({ target: [messages.deviceId, messages.id] });
    this.notify(entries);
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

  private notify(
    entries: ReadonlyArray<{
      conversation: ConversationKey;
    }>,
  ): void {
    if (!this.coordinator) return;
    const seen = new Set<string>();
    for (const entry of entries) {
      const key = conversationKeyString(entry.conversation);
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
  state: "pending" | "ack" | "relayed" | "failed";
  routingError: number | null;
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
    routingError: row.routingError ?? undefined,
  };
}

function messageToRow(
  deviceId: number,
  message: Message,
  conv: ConversationKey,
): MessageRow {
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
    routingError: message.routingError ?? null,
  };
}
