import { reactionKey } from "@core/messaging/reactions.ts";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  inArray,
  lt,
  max,
  ne,
  or,
  sql,
} from "drizzle-orm";
import type { MultiTabCoordinator } from "./coordinator.ts";
import type { SqlocalDb } from "./db.ts";
import {
  type MessageInsert,
  type MessageRow,
  messages,
  type ReactionInsert,
  type ReactionRow,
  reactions,
  readMarkers,
} from "./schema.ts";
import {
  type ConversationKey,
  conversationKeyString,
  inferConversation,
  type Message,
  type MessageCursor,
  type MessageDeliveryPatch,
  type MessageRef,
  type MessageRepository,
  type MessageState,
  parseConversationKey,
  type Reaction,
  type ReactionDeliveryPatch,
  type RetentionPolicy,
  type StoredConversation,
} from "./types.ts";

export interface SqlocalMessageRepositoryOptions {
  /**
   * The `device_id` rows are stored and read under: the storage scope, e.g.
   * the radio's node number. Change it later with `setScope`.
   */
  deviceId: number;
  /** Optional cross-tab coordinator. If omitted, mutations are silent. */
  coordinator?: MultiTabCoordinator;
}

/** SQLite caps bound parameters; chunk `IN (...)` lists well under it. */
const MAX_IN_LIST = 500;

/**
 * Messages, their reactions and per-conversation read markers, all scoped to
 * one radio's history (`device_id`).
 */
export class SqlocalMessageRepository implements MessageRepository {
  private readonly db: SqlocalDb;
  private deviceId: number;
  private readonly coordinator: MultiTabCoordinator | undefined;

  constructor(db: SqlocalDb, options: SqlocalMessageRepositoryOptions) {
    this.db = db;
    this.deviceId = options.deviceId;
    this.coordinator = options.coordinator;
  }

  /**
   * Points every later read and write at another `device_id`. Rows under the
   * old one are left as they are.
   */
  setScope(deviceId: number): void {
    this.deviceId = deviceId;
  }

  async loadRecent(key: ConversationKey, limit: number): Promise<Message[]> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(this.scoped(key))
      .orderBy(desc(messages.rxTime), desc(messages.seq))
      .limit(limit);
    return rows.reverse().map(rowToMessage);
  }

  async loadBefore(
    key: ConversationKey,
    cursor: MessageCursor,
    limit: number,
  ): Promise<Message[]> {
    const at = cursor.rxTime.getTime();
    const before =
      cursor.seq === undefined
        ? lt(messages.rxTime, at)
        : or(
            lt(messages.rxTime, at),
            and(eq(messages.rxTime, at), lt(messages.seq, cursor.seq)),
          );
    const rows = await this.db
      .select()
      .from(messages)
      .where(and(this.scoped(key), before))
      .orderBy(desc(messages.rxTime), desc(messages.seq))
      .limit(limit);
    return rows.reverse().map(rowToMessage);
  }

  async append(message: Message, key?: ConversationKey): Promise<void> {
    await this.insert([
      messageToRow(this.deviceId, message, key ?? inferConversation(message)),
    ]);
  }

  async appendBatch(input: ReadonlyArray<Message>): Promise<void> {
    await this.insert(
      input.map((m) => messageToRow(this.deviceId, m, inferConversation(m))),
    );
  }

  private async insert(rows: MessageInsert[]): Promise<void> {
    if (rows.length === 0) return;
    await this.db.insert(messages).values(rows).onConflictDoNothing();
    this.notify(rows.map((r) => r.conversationKey));
  }

  async updateDelivery(
    ref: MessageRef,
    patch: MessageDeliveryPatch,
  ): Promise<void> {
    const set: Partial<MessageInsert> = {};
    if ("state" in patch) set.state = patch.state;
    if ("ackProof" in patch) set.ackProof = patch.ackProof ?? null;
    if ("routingError" in patch) set.routingError = patch.routingError ?? null;
    if ("relays" in patch) set.relays = patch.relays ?? null;
    if (Object.keys(set).length === 0) return;
    await this.db.update(messages).set(set).where(this.byRef(ref));
  }

  async updateState(ref: MessageRef, state: MessageState): Promise<void> {
    await this.db.update(messages).set({ state }).where(this.byRef(ref));
  }

  async remove(ref: MessageRef): Promise<void> {
    await this.db.delete(messages).where(this.byRef(ref));
    await this.removeOrphanReactions();
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
          ),
        );
    }
    if (policy.maxPerBucket !== undefined) {
      // Keep the newest N per (device, conversation_key). SQLite has no
      // per-group LIMIT, so use a windowed delete.
      await this.db.run(sql`
        DELETE FROM messages
        WHERE device_id = ${this.deviceId}
          AND seq IN (
            SELECT seq FROM (
              SELECT seq,
                     row_number() OVER (
                       PARTITION BY conversation_key
                       ORDER BY rx_time DESC, seq DESC
                     ) AS rn
              FROM messages
              WHERE device_id = ${this.deviceId}
            )
            WHERE rn > ${policy.maxPerBucket}
          )
      `);
    }
    await this.removeOrphanReactions();
  }

  async clearConversation(key: ConversationKey): Promise<void> {
    const k = conversationKeyString(key);
    await this.db.delete(messages).where(this.scoped(key));
    await this.db
      .delete(reactions)
      .where(
        and(
          eq(reactions.deviceId, this.deviceId),
          eq(reactions.conversationKey, k),
        ),
      );
    await this.db
      .delete(readMarkers)
      .where(
        and(
          eq(readMarkers.deviceId, this.deviceId),
          eq(readMarkers.conversationKey, k),
        ),
      );
    this.notify([k]);
  }

  async clear(): Promise<void> {
    await this.db.delete(messages).where(eq(messages.deviceId, this.deviceId));
    await this.db
      .delete(reactions)
      .where(eq(reactions.deviceId, this.deviceId));
    await this.db
      .delete(readMarkers)
      .where(eq(readMarkers.deviceId, this.deviceId));
  }

  async findByIds(ids: ReadonlyArray<number>): Promise<Message[]> {
    const rows = await this.inChunks(ids, (chunk) =>
      this.db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.deviceId, this.deviceId),
            inArray(messages.packetId, chunk),
          ),
        ),
    );
    return rows.map(rowToMessage);
  }

  async loadReactions(targetIds: ReadonlyArray<number>): Promise<Reaction[]> {
    const rows = await this.inChunks(targetIds, (chunk) =>
      this.db
        .select()
        .from(reactions)
        .where(
          and(
            eq(reactions.deviceId, this.deviceId),
            inArray(reactions.targetId, chunk),
          ),
        )
        .orderBy(asc(reactions.rxTime)),
    );
    return rows.map(rowToReaction);
  }

  async addReaction(reaction: Reaction, key: ConversationKey): Promise<void> {
    const row: ReactionInsert = {
      deviceId: this.deviceId,
      targetId: reaction.targetId,
      fromNode: reaction.fromNode,
      emojiKey: reactionKey(reaction.emoji),
      emoji: reaction.emoji,
      packetId: reaction.packetId,
      toNode: reaction.to,
      conversationKey: conversationKeyString(key),
      rxTime: reaction.rxTime.getTime(),
      state: reaction.state,
      routingError: reaction.routingError ?? null,
    };
    await this.db.insert(reactions).values(row).onConflictDoNothing();
    this.notify([row.conversationKey]);
  }

  async removeReaction(
    targetId: number,
    fromNode: number,
    emoji: string,
  ): Promise<void> {
    await this.db
      .delete(reactions)
      .where(
        and(
          eq(reactions.deviceId, this.deviceId),
          eq(reactions.targetId, targetId),
          eq(reactions.fromNode, fromNode),
          eq(reactions.emojiKey, reactionKey(emoji)),
        ),
      );
  }

  async updateReactionDelivery(
    ref: { readonly packetId: number; readonly fromNode: number },
    patch: ReactionDeliveryPatch,
  ): Promise<void> {
    const set: Partial<ReactionInsert> = {};
    if ("state" in patch) set.state = patch.state;
    if ("routingError" in patch) set.routingError = patch.routingError ?? null;
    if (Object.keys(set).length === 0) return;
    await this.db
      .update(reactions)
      .set(set)
      .where(
        and(
          eq(reactions.deviceId, this.deviceId),
          eq(reactions.fromNode, ref.fromNode),
          eq(reactions.packetId, ref.packetId),
        ),
      );
  }

  async loadConversations(myNodeNum: number): Promise<StoredConversation[]> {
    // SQLite fills bare columns of a max() aggregate from the row holding
    // the maximum, so this is each conversation's latest message.
    const latest = await this.db
      .select({ ...getTableColumns(messages), latestSeq: max(messages.seq) })
      .from(messages)
      .where(eq(messages.deviceId, this.deviceId))
      .groupBy(messages.conversationKey);
    const unread = await this.db
      .select({ key: messages.conversationKey, unread: count() })
      .from(messages)
      .leftJoin(
        readMarkers,
        and(
          eq(readMarkers.deviceId, messages.deviceId),
          eq(readMarkers.conversationKey, messages.conversationKey),
        ),
      )
      .where(
        and(
          eq(messages.deviceId, this.deviceId),
          ne(messages.fromNode, myNodeNum),
          // The scope is the radio's own node number: its messages are mine.
          ne(messages.fromNode, this.deviceId),
          gt(messages.seq, sql`coalesce(${readMarkers.lastReadSeq}, 0)`),
        ),
      )
      .groupBy(messages.conversationKey);
    const unreadByKey = new Map(unread.map((r) => [r.key, r.unread]));
    return latest.flatMap((row) => {
      const key = tryParseKey(row.conversationKey);
      return key
        ? [
            {
              key,
              lastMessage: rowToMessage(row),
              unread: unreadByKey.get(row.conversationKey) ?? 0,
            },
          ]
        : [];
    });
  }

  async markRead(key: ConversationKey): Promise<void> {
    const [row] = await this.db
      .select({ seq: max(messages.seq) })
      .from(messages)
      .where(this.scoped(key));
    const seq = row?.seq;
    if (seq === null || seq === undefined) return;
    await this.db
      .insert(readMarkers)
      .values({
        deviceId: this.deviceId,
        conversationKey: conversationKeyString(key),
        lastReadSeq: seq,
      })
      .onConflictDoUpdate({
        target: [readMarkers.deviceId, readMarkers.conversationKey],
        set: {
          lastReadSeq: sql`max(${readMarkers.lastReadSeq}, excluded.last_read_seq)`,
        },
      });
  }

  private async removeOrphanReactions(): Promise<void> {
    await this.db.run(sql`
      DELETE FROM reactions
      WHERE device_id = ${this.deviceId}
        AND target_id NOT IN (
          SELECT packet_id FROM messages WHERE device_id = ${this.deviceId}
        )
    `);
  }

  private async inChunks<T>(
    ids: ReadonlyArray<number>,
    query: (chunk: number[]) => Promise<T[]>,
  ): Promise<T[]> {
    const unique = [...new Set(ids)];
    const out: T[] = [];
    for (let i = 0; i < unique.length; i += MAX_IN_LIST) {
      out.push(...(await query(unique.slice(i, i + MAX_IN_LIST))));
    }
    return out;
  }

  private scoped(key: ConversationKey) {
    return and(
      eq(messages.deviceId, this.deviceId),
      eq(messages.conversationKey, conversationKeyString(key)),
    );
  }

  private byRef(ref: MessageRef) {
    return and(
      eq(messages.deviceId, this.deviceId),
      eq(messages.fromNode, ref.from),
      eq(messages.packetId, ref.id),
    );
  }

  private notify(keys: ReadonlyArray<string>): void {
    if (!this.coordinator) return;
    for (const key of new Set(keys)) {
      this.coordinator.broadcast({
        kind: "messages-changed",
        deviceId: this.deviceId,
        key,
      });
    }
  }
}

function tryParseKey(s: string): ConversationKey | undefined {
  try {
    return parseConversationKey(s);
  } catch {
    return undefined;
  }
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.packetId,
    from: row.fromNode,
    to: row.toNode,
    channel: row.channel,
    rxTime: new Date(row.rxTime),
    type: row.type,
    text: row.text,
    state: row.state,
    replyId: row.replyId ?? undefined,
    seq: row.seq,
    signed: row.signed ?? undefined,
    ackProof: row.ackProof ?? undefined,
    routingError: row.routingError ?? undefined,
    relays: row.relays ?? undefined,
    snr: row.snr ?? undefined,
    rssi: row.rssi ?? undefined,
    hopsAway: row.hopsAway ?? undefined,
    viaMqtt: row.viaMqtt ?? undefined,
    transport: row.transport ?? undefined,
  };
}

function messageToRow(
  deviceId: number,
  message: Message,
  conv: ConversationKey,
): MessageInsert {
  return {
    deviceId,
    packetId: message.id,
    conversationKey: conversationKeyString(conv),
    fromNode: message.from,
    toNode: message.to,
    channel: message.channel,
    rxTime: message.rxTime.getTime(),
    type: message.type,
    text: message.text,
    replyId: message.replyId ?? null,
    state: message.state,
    signed: message.signed ?? null,
    ackProof: message.ackProof ?? null,
    routingError: message.routingError ?? null,
    relays: message.relays ?? null,
    snr: message.snr ?? null,
    rssi: message.rssi ?? null,
    hopsAway: message.hopsAway ?? null,
    viaMqtt: message.viaMqtt ?? null,
    transport: message.transport ?? null,
  };
}

function rowToReaction(row: ReactionRow): Reaction {
  return {
    targetId: row.targetId,
    fromNode: row.fromNode,
    emoji: row.emoji,
    packetId: row.packetId,
    to: row.toNode,
    rxTime: new Date(row.rxTime),
    state: row.state,
    routingError: row.routingError ?? undefined,
  };
}
