import { textMentionsNode } from "@core/messaging/mentions.ts";
import { reactionKey } from "@core/messaging/reactions.ts";
import { formatNodeId } from "@core/utils/nodeIdentity.ts";
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  inArray,
  like,
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
import { type ScopeOptions, type StorageScope, scopeOf } from "./scope.ts";
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

/**
 * `scope` (or a fixed `deviceId`) is the `device_id` rows are stored and read
 * under: the radio's node number, or a connection's provisional scope.
 */
export type SqlocalMessageRepositoryOptions = ScopeOptions & {
  /** Optional cross-tab coordinator. If omitted, mutations are silent. */
  coordinator?: MultiTabCoordinator;
};

/** SQLite caps bound parameters; chunk `IN (...)` lists well under it. */
const MAX_IN_LIST = 500;

/**
 * Messages, their reactions and per-conversation read markers, all scoped to
 * one radio's history (`device_id`).
 */
export class SqlocalMessageRepository implements MessageRepository {
  private readonly db: SqlocalDb;
  private readonly scope: StorageScope;
  private readonly coordinator: MultiTabCoordinator | undefined;

  constructor(db: SqlocalDb, options: SqlocalMessageRepositoryOptions) {
    this.db = db;
    this.scope = scopeOf(options);
    this.coordinator = options.coordinator;
  }

  /**
   * Points every later read and write at another `device_id`. Rows under the
   * old one are left as they are.
   */
  setScope(deviceId: number): void {
    this.scope.set(deviceId);
  }

  loadRecent(key: ConversationKey, limit: number): Promise<Message[]> {
    return this.scope.run(async (deviceId) => {
      const rows = await this.db
        .select()
        .from(messages)
        .where(scoped(deviceId, key))
        .orderBy(desc(messages.rxTime), desc(messages.seq))
        .limit(limit);
      return rows.reverse().map(rowToMessage);
    });
  }

  loadBefore(
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
    return this.scope.run(async (deviceId) => {
      const rows = await this.db
        .select()
        .from(messages)
        .where(and(scoped(deviceId, key), before))
        .orderBy(desc(messages.rxTime), desc(messages.seq))
        .limit(limit);
      return rows.reverse().map(rowToMessage);
    });
  }

  append(message: Message, key?: ConversationKey): Promise<void> {
    return this.scope.run((deviceId) =>
      this.insert(deviceId, [
        messageToRow(deviceId, message, key ?? inferConversation(message)),
      ]),
    );
  }

  appendBatch(input: ReadonlyArray<Message>): Promise<void> {
    return this.scope.run((deviceId) =>
      this.insert(
        deviceId,
        input.map((m) => messageToRow(deviceId, m, inferConversation(m))),
      ),
    );
  }

  private async insert(deviceId: number, rows: MessageInsert[]): Promise<void> {
    if (rows.length === 0) return;
    await this.db.insert(messages).values(rows).onConflictDoNothing();
    this.notify(
      deviceId,
      rows.map((r) => r.conversationKey),
    );
  }

  updateDelivery(ref: MessageRef, patch: MessageDeliveryPatch): Promise<void> {
    const set: Partial<MessageInsert> = {};
    if ("state" in patch) set.state = patch.state;
    if ("ackProof" in patch) set.ackProof = patch.ackProof ?? null;
    if ("routingError" in patch) set.routingError = patch.routingError ?? null;
    if ("relays" in patch) set.relays = patch.relays ?? null;
    if (Object.keys(set).length === 0) return Promise.resolve();
    return this.scope.run(async (deviceId) => {
      await this.db.update(messages).set(set).where(byRef(deviceId, ref));
    });
  }

  updateState(ref: MessageRef, state: MessageState): Promise<void> {
    return this.scope.run(async (deviceId) => {
      await this.db.update(messages).set({ state }).where(byRef(deviceId, ref));
    });
  }

  remove(ref: MessageRef): Promise<void> {
    return this.scope.run(async (deviceId) => {
      await this.db.delete(messages).where(byRef(deviceId, ref));
      await this.removeOrphanReactions(deviceId);
    });
  }

  prune(policy: RetentionPolicy): Promise<void> {
    return this.scope.run(async (deviceId) => {
      if (policy.olderThanMs !== undefined) {
        const cutoff = Date.now() - policy.olderThanMs;
        await this.db
          .delete(messages)
          .where(
            and(eq(messages.deviceId, deviceId), lt(messages.rxTime, cutoff)),
          );
      }
      if (policy.maxPerBucket !== undefined) {
        // Keep the newest N per (device, conversation_key). SQLite has no
        // per-group LIMIT, so use a windowed delete.
        await this.db.run(sql`
          DELETE FROM messages
          WHERE device_id = ${deviceId}
            AND seq IN (
              SELECT seq FROM (
                SELECT seq,
                       row_number() OVER (
                         PARTITION BY conversation_key
                         ORDER BY rx_time DESC, seq DESC
                       ) AS rn
                FROM messages
                WHERE device_id = ${deviceId}
              )
              WHERE rn > ${policy.maxPerBucket}
            )
        `);
      }
      await this.removeOrphanReactions(deviceId);
    });
  }

  clearConversation(key: ConversationKey): Promise<void> {
    const k = conversationKeyString(key);
    return this.scope.run(async (deviceId) => {
      await this.db.delete(messages).where(scoped(deviceId, key));
      await this.db
        .delete(reactions)
        .where(
          and(
            eq(reactions.deviceId, deviceId),
            eq(reactions.conversationKey, k),
          ),
        );
      await this.db
        .delete(readMarkers)
        .where(
          and(
            eq(readMarkers.deviceId, deviceId),
            eq(readMarkers.conversationKey, k),
          ),
        );
      this.notify(deviceId, [k]);
    });
  }

  clear(): Promise<void> {
    return this.scope.run(async (deviceId) => {
      await this.db.delete(messages).where(eq(messages.deviceId, deviceId));
      await this.db.delete(reactions).where(eq(reactions.deviceId, deviceId));
      await this.db
        .delete(readMarkers)
        .where(eq(readMarkers.deviceId, deviceId));
    });
  }

  findByIds(ids: ReadonlyArray<number>): Promise<Message[]> {
    return this.scope.run(async (deviceId) => {
      const rows = await this.inChunks(ids, (chunk) =>
        this.db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.deviceId, deviceId),
              inArray(messages.packetId, chunk),
            ),
          ),
      );
      return rows.map(rowToMessage);
    });
  }

  loadReactions(targetIds: ReadonlyArray<number>): Promise<Reaction[]> {
    return this.scope.run(async (deviceId) => {
      const rows = await this.inChunks(targetIds, (chunk) =>
        this.db
          .select()
          .from(reactions)
          .where(
            and(
              eq(reactions.deviceId, deviceId),
              inArray(reactions.targetId, chunk),
            ),
          )
          .orderBy(asc(reactions.rxTime)),
      );
      return rows.map(rowToReaction);
    });
  }

  addReaction(reaction: Reaction, key: ConversationKey): Promise<void> {
    return this.scope.run((deviceId) =>
      this.insertReaction(deviceId, reaction, key),
    );
  }

  private async insertReaction(
    deviceId: number,
    reaction: Reaction,
    key: ConversationKey,
  ): Promise<void> {
    const row: ReactionInsert = {
      deviceId,
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
    this.notify(deviceId, [row.conversationKey]);
  }

  removeReaction(
    targetId: number,
    fromNode: number,
    emoji: string,
  ): Promise<void> {
    return this.scope.run(async (deviceId) => {
      await this.db
        .delete(reactions)
        .where(
          and(
            eq(reactions.deviceId, deviceId),
            eq(reactions.targetId, targetId),
            eq(reactions.fromNode, fromNode),
            eq(reactions.emojiKey, reactionKey(emoji)),
          ),
        );
    });
  }

  updateReactionDelivery(
    ref: { readonly packetId: number; readonly fromNode: number },
    patch: ReactionDeliveryPatch,
  ): Promise<void> {
    const set: Partial<ReactionInsert> = {};
    if ("state" in patch) set.state = patch.state;
    if ("routingError" in patch) set.routingError = patch.routingError ?? null;
    if (Object.keys(set).length === 0) return Promise.resolve();
    return this.scope.run(async (deviceId) => {
      await this.db
        .update(reactions)
        .set(set)
        .where(
          and(
            eq(reactions.deviceId, deviceId),
            eq(reactions.fromNode, ref.fromNode),
            eq(reactions.packetId, ref.packetId),
          ),
        );
    });
  }

  loadConversations(myNodeNum: number): Promise<StoredConversation[]> {
    return this.scope.run((deviceId) =>
      this.conversations(deviceId, myNodeNum),
    );
  }

  private async conversations(
    deviceId: number,
    myNodeNum: number,
  ): Promise<StoredConversation[]> {
    // SQLite fills bare columns of a max() aggregate from the row holding
    // the maximum, so this is each conversation's latest message. Filtered
    // messages are never the preview nor unread (as on Android).
    const latest = await this.db
      .select({ ...getTableColumns(messages), latestSeq: max(messages.seq) })
      .from(messages)
      .where(and(eq(messages.deviceId, deviceId), eq(messages.filtered, false)))
      .groupBy(messages.conversationKey);
    const unreadOnly = and(
      eq(messages.deviceId, deviceId),
      eq(messages.filtered, false),
      ne(messages.fromNode, myNodeNum),
      // The scope is the radio's own node number: its messages are mine.
      ne(messages.fromNode, deviceId),
      gt(messages.seq, sql`coalesce(${readMarkers.lastReadSeq}, 0)`),
    );
    const readMarkerJoin = and(
      eq(readMarkers.deviceId, messages.deviceId),
      eq(readMarkers.conversationKey, messages.conversationKey),
    );
    const unread = await this.db
      .select({ key: messages.conversationKey, unread: count() })
      .from(messages)
      .leftJoin(readMarkers, readMarkerJoin)
      .where(unreadOnly)
      .groupBy(messages.conversationKey);
    // Unread messages that @mention me. LIKE (case-insensitive for ASCII)
    // narrows them down; the token's boundary is checked here.
    const myId = formatNodeId(myNodeNum);
    const mentionRows = await this.db
      .select({
        key: messages.conversationKey,
        from: messages.fromNode,
        text: messages.text,
      })
      .from(messages)
      .leftJoin(readMarkers, readMarkerJoin)
      .where(and(unreadOnly, like(messages.text, `%@${myId}%`)))
      .orderBy(asc(messages.seq));
    const mentionsByKey = new Map<string, number[]>();
    for (const row of mentionRows) {
      if (textMentionsNode(row.text, myId)) {
        mentionsByKey.set(row.key, [
          ...(mentionsByKey.get(row.key) ?? []),
          row.from,
        ]);
      }
    }
    const unreadByKey = new Map(unread.map((r) => [r.key, r.unread]));
    return latest.flatMap((row) => {
      const key = tryParseKey(row.conversationKey);
      const mentionedBy = mentionsByKey.get(row.conversationKey);
      return key
        ? [
            {
              key,
              lastMessage: rowToMessage(row),
              unread: unreadByKey.get(row.conversationKey) ?? 0,
              ...(mentionedBy ? { mentionedBy } : {}),
            },
          ]
        : [];
    });
  }

  markRead(key: ConversationKey): Promise<void> {
    return this.scope.run((deviceId) => this.markReadIn(deviceId, key));
  }

  private async markReadIn(
    deviceId: number,
    key: ConversationKey,
  ): Promise<void> {
    const [row] = await this.db
      .select({ seq: max(messages.seq) })
      .from(messages)
      .where(scoped(deviceId, key));
    const seq = row?.seq;
    if (seq === null || seq === undefined) return;
    await this.db
      .insert(readMarkers)
      .values({
        deviceId,
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

  private async removeOrphanReactions(deviceId: number): Promise<void> {
    await this.db.run(sql`
      DELETE FROM reactions
      WHERE device_id = ${deviceId}
        AND target_id NOT IN (
          SELECT packet_id FROM messages WHERE device_id = ${deviceId}
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

  private notify(deviceId: number, keys: ReadonlyArray<string>): void {
    if (!this.coordinator) return;
    for (const key of new Set(keys)) {
      this.coordinator.broadcast({
        kind: "messages-changed",
        deviceId,
        key,
      });
    }
  }
}

function scoped(deviceId: number, key: ConversationKey) {
  return and(
    eq(messages.deviceId, deviceId),
    eq(messages.conversationKey, conversationKeyString(key)),
  );
}

function byRef(deviceId: number, ref: MessageRef) {
  return and(
    eq(messages.deviceId, deviceId),
    eq(messages.fromNode, ref.from),
    eq(messages.packetId, ref.id),
  );
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
    ...(row.filtered ? { filtered: true } : {}),
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
    filtered: message.filtered ?? false,
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
