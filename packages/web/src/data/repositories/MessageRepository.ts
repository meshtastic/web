import { and, desc, eq, gt, ne, or, sql } from "drizzle-orm";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import logger from "../../core/services/logger.ts";
import { dbClient } from "../client.ts";
import {
  lastRead,
  type Message,
  type MessageDraft,
  messageDrafts,
  messages,
  type NewMessage,
} from "../schema.ts";
import type { ConversationType } from "../types.ts";

/**
 * Repository for message operations
 */
export class MessageRepository {
  private get db() {
    return dbClient.db;
  }

  getClient(client?: SQLocalDrizzle) {
    return client ?? dbClient.client;
  }

  /**
   * Build a query to get direct messages between two nodes
   */
  buildDirectMessagesQuery(
    ownerNodeNum: number,
    nodeA: number,
    nodeB: number,
    limit = 50,
  ) {
    return this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.type, "direct"),
          or(
            and(eq(messages.fromNode, nodeA), eq(messages.toNode, nodeB)),
            and(eq(messages.fromNode, nodeB), eq(messages.toNode, nodeA)),
          ),
        ),
      )
      .orderBy(desc(messages.date))
      .limit(limit);
  }

  /**
   * Build a query to get broadcast messages for a channel
   */
  buildBroadcastMessagesQuery(
    ownerNodeNum: number,
    channelId: number,
    limit = 50,
  ) {
    logger.debug(
      `[MessageRepo] buildBroadcastMessagesQuery: ownerNodeNum=${ownerNodeNum}, channelId=${channelId}, limit=${limit}`,
    );
    return this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.type, "channel"),
          eq(messages.channelId, channelId),
        ),
      )
      .orderBy(desc(messages.date))
      .limit(limit);
  }

  /**
   * Build a query to get all messages for a device (paginated)
   */
  buildAllMessagesQuery(ownerNodeNum: number, limit = 100, offset = 0) {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.ownerNodeNum, ownerNodeNum))
      .orderBy(desc(messages.date))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Build a query to get pending messages (for retry logic)
   */
  buildPendingMessagesQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          or(
            eq(messages.state, "waiting"),
            eq(messages.state, "sending"),
            eq(messages.state, "failed"),
          ),
        ),
      )
      .orderBy(desc(messages.date));
  }

  /**
   * Build a query to get all direct messages (for conversation computation)
   * Returns messages sorted by date descending
   */
  buildAllDirectMessagesQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.type, "direct"),
        ),
      )
      .orderBy(desc(messages.date));
  }

  /**
   * Build a query to get all channel messages (for conversation computation)
   * Returns messages sorted by date descending
   */
  buildAllChannelMessagesQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.type, "channel"),
        ),
      )
      .orderBy(desc(messages.date));
  }

  /**
   * Build a query to get all lastRead entries (for unread count computation)
   */
  buildLastReadQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(lastRead)
      .where(eq(lastRead.ownerNodeNum, ownerNodeNum));
  }

  // ===================
  // Async Methods (execute queries)
  // ===================

  /**
   * Get direct messages between two nodes
   */
  async getDirectMessages(
    ownerNodeNum: number,
    nodeA: number,
    nodeB: number,
    limit = 50,
  ): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.type, "direct"),
          or(
            and(eq(messages.fromNode, nodeA), eq(messages.toNode, nodeB)),
            and(eq(messages.fromNode, nodeB), eq(messages.toNode, nodeA)),
          ),
        ),
      )
      .orderBy(desc(messages.date))
      .limit(limit);
  }

  /**
   * Get channel messages for a channel
   */
  async getBroadcastMessages(
    ownerNodeNum: number,
    channelId: number,
    limit = 50,
  ): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.type, "channel"),
          eq(messages.channelId, channelId),
        ),
      )
      .orderBy(desc(messages.date))
      .limit(limit);
  }

  /**
   * Get all messages for a device (paginated)
   */
  async getAllMessages(
    ownerNodeNum: number,
    limit = 100,
    offset = 0,
  ): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.ownerNodeNum, ownerNodeNum))
      .orderBy(desc(messages.date))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get a message by its packet messageId
   * Used for looking up replied-to messages
   */
  async getMessageByMessageId(
    ownerNodeNum: number,
    messageId: number,
  ): Promise<Message | undefined> {
    const result = await this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.messageId, messageId),
        ),
      )
      .limit(1);
    return result[0];
  }

  /**
   * Build a query to get a message by its packet messageId
   * Used for reactive lookup of replied-to messages
   */
  buildMessageByMessageIdQuery(ownerNodeNum: number, messageId: number) {
    return this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.messageId, messageId),
        ),
      )
      .limit(1);
  }

  /**
   * Create a map of messageId -> Message for fast lookup
   * Useful for looking up replied-to messages
   */
  createMessageIdMap(messageList: Message[]): Map<number, Message> {
    const map = new Map<number, Message>();
    for (const msg of messageList) {
      map.set(msg.messageId, msg);
    }
    return map;
  }

  /**
   * Save a new message
   */
  async saveMessage(message: NewMessage): Promise<void> {
    logger.debug(
      `[MessageRepo] saveMessage: ownerNodeNum=${message.ownerNodeNum}, type=${message.type}, channelId=${message.channelId}, from=${message.fromNode}`,
    );
    await this.db.insert(messages).values(message);
  }

  /**
   * Update message state by database ID
   */
  async updateMessageState(
    id: number,
    ownerNodeNum: number,
    newState: Message["state"],
  ): Promise<void> {
    await this.db
      .update(messages)
      .set({ state: newState })
      .where(and(eq(messages.id, id), eq(messages.ownerNodeNum, ownerNodeNum)));
  }

  /**
   * Update message state by packet messageId
   */
  async updateMessageStateByMessageId(
    messageId: number,
    ownerNodeNum: number,
    newState: Message["state"],
  ): Promise<void> {
    await this.db
      .update(messages)
      .set({ state: newState })
      .where(
        and(
          eq(messages.messageId, messageId),
          eq(messages.ownerNodeNum, ownerNodeNum),
        ),
      );
  }

  /**
   * Increment retry count for a message
   */
  async incrementRetryCount(
    messageId: number,
    ownerNodeNum: number,
  ): Promise<void> {
    await this.db
      .update(messages)
      .set({ retryCount: sql`${messages.retryCount} + 1` })
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.ownerNodeNum, ownerNodeNum),
        ),
      );
  }

  /**
   * Update message ACK status
   */
  async updateMessageAck(
    messageId: number,
    ownerNodeNum: number,
    ackData: {
      receivedACK: boolean;
      ackTimestamp: Date;
      ackSNR: number;
      realACK: boolean;
    },
  ): Promise<void> {
    await this.db
      .update(messages)
      .set(ackData)
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.ownerNodeNum, ownerNodeNum),
        ),
      );
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: number, ownerNodeNum: number): Promise<void> {
    await this.db
      .delete(messages)
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.ownerNodeNum, ownerNodeNum),
        ),
      );
  }

  /**
   * Delete all messages for a conversation
   */
  async deleteConversation(
    ownerNodeNum: number,
    nodeA: number,
    nodeB: number,
  ): Promise<void> {
    await this.db
      .delete(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.type, "direct"),
          or(
            and(eq(messages.fromNode, nodeA), eq(messages.toNode, nodeB)),
            and(eq(messages.fromNode, nodeB), eq(messages.toNode, nodeA)),
          ),
        ),
      );
  }

  /**
   * Delete all messages for a channel
   */
  async deleteChannelMessages(
    ownerNodeNum: number,
    channelId: number,
  ): Promise<void> {
    await this.db
      .delete(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.type, "channel"),
          eq(messages.channelId, channelId),
        ),
      );
  }

  /**
   * Delete all messages for a device
   */
  async deleteAllMessages(ownerNodeNum: number): Promise<void> {
    await this.db
      .delete(messages)
      .where(eq(messages.ownerNodeNum, ownerNodeNum));
  }

  /**
   * Get unacked/failed messages for retry
   */
  async getPendingMessages(ownerNodeNum: number): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          or(
            eq(messages.state, "waiting"),
            eq(messages.state, "sending"),
            eq(messages.state, "failed"),
          ),
        ),
      )
      .orderBy(desc(messages.date));
  }

  /**
   * Get message count for a device
   */
  async getMessageCount(ownerNodeNum: number): Promise<number> {
    const result = await this.db
      .select()
      .from(messages)
      .where(eq(messages.ownerNodeNum, ownerNodeNum));
    return result.length;
  }

  /**
   * Debug: Get all messages without ownerNodeNum filter
   * Used to diagnose issues with message storage
   */
  async debugGetAllMessages(): Promise<
    Array<{ ownerNodeNum: number; count: number }>
  > {
    const result = await this.db
      .select({
        ownerNodeNum: messages.ownerNodeNum,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .groupBy(messages.ownerNodeNum);
    return result;
  }

  /**
   * Get conversations list with last message and unread counts
   * Returns both direct conversations and channel conversations
   * @param myNodeNum - The current user's node number (needed for unread count calculations)
   */
  async getConversations(
    ownerNodeNum: number,
    myNodeNum: number,
  ): Promise<
    Array<{
      type: ConversationType;
      id: number;
      lastMessage: Message | null;
      unreadCount: number;
    }>
  > {
    // 1. Get direct conversations - find unique normalized pairs with last date
    const directConvosSubquery = this.db
      .select({
        nodeA:
          sql<number>`CASE WHEN ${messages.fromNode} < ${messages.toNode} THEN ${messages.fromNode} ELSE ${messages.toNode} END`.as(
            "node_a",
          ),
        nodeB:
          sql<number>`CASE WHEN ${messages.fromNode} < ${messages.toNode} THEN ${messages.toNode} ELSE ${messages.fromNode} END`.as(
            "node_b",
          ),
        lastDate: sql<Date>`MAX(${messages.date})`.as("last_date"),
      })
      .from(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.type, "direct"),
        ),
      )
      .groupBy(sql`node_a`, sql`node_b`)
      .as("direct_convos");

    // 2. Join to get full message details for direct conversations
    const directMessages = await this.db
      .select({
        message: messages,
        otherNode:
          sql<number>`CASE WHEN ${messages.fromNode} = ${directConvosSubquery.nodeA} THEN ${directConvosSubquery.nodeB} ELSE ${directConvosSubquery.nodeA} END`.as(
            "other_node",
          ),
      })
      .from(directConvosSubquery)
      .innerJoin(
        messages,
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.type, "direct"),
          eq(messages.date, directConvosSubquery.lastDate),
          or(
            and(
              eq(messages.fromNode, directConvosSubquery.nodeA),
              eq(messages.toNode, directConvosSubquery.nodeB),
            ),
            and(
              eq(messages.fromNode, directConvosSubquery.nodeB),
              eq(messages.toNode, directConvosSubquery.nodeA),
            ),
          ),
        ),
      )
      .orderBy(desc(messages.date));

    // 3. Get channel channels - subquery for max date per channel
    const broadcastSubquery = this.db
      .select({
        channelId: messages.channelId,
        maxDate: sql<Date>`MAX(${messages.date})`.as("max_date"),
      })
      .from(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.type, "channel"),
        ),
      )
      .groupBy(messages.channelId)
      .as("broadcast_max");

    // 4. Join to get full message details for broadcasts
    const broadcastMessages = await this.db
      .select({
        message: messages,
      })
      .from(broadcastSubquery)
      .innerJoin(
        messages,
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.type, "channel"),
          eq(messages.channelId, broadcastSubquery.channelId),
          eq(messages.date, broadcastSubquery.maxDate),
        ),
      )
      .orderBy(desc(messages.date));

    const conversations: Array<{
      type: ConversationType;
      id: number;
      lastMessage: Message | null;
      unreadCount: number;
    }> = [];

    // Process direct conversations
    for (const row of directMessages) {
      // Determine the other node from myNodeNum's perspective
      const otherNode =
        row.message.fromNode === myNodeNum
          ? row.message.toNode
          : row.message.fromNode;
      const unreadCount = await this.getUnreadCountDirect(
        ownerNodeNum,
        myNodeNum,
        otherNode,
      );
      conversations.push({
        type: "direct",
        id: otherNode,
        lastMessage: row.message,
        unreadCount,
      });
    }

    // Process channel conversations
    for (const row of broadcastMessages) {
      const unreadCount = await this.getUnreadCountBroadcast(
        ownerNodeNum,
        row.message.channelId,
      );
      conversations.push({
        type: "channel",
        id: row.message.channelId,
        lastMessage: row.message,
        unreadCount,
      });
    }

    // Sort by last message date
    conversations.sort((a, b) => {
      const aDate = a.lastMessage?.date?.getTime() || 0;
      const bDate = b.lastMessage?.date?.getTime() || 0;
      return bDate - aDate;
    });

    return conversations;
  }

  /**
   * Mark conversation as read up to a specific message
   */
  async markAsRead(
    ownerNodeNum: number,
    type: ConversationType,
    conversationId: string,
    messageId: number,
  ): Promise<void> {
    await this.db
      .insert(lastRead)
      .values({
        ownerNodeNum,
        type,
        conversationId,
        messageId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [lastRead.ownerNodeNum, lastRead.type, lastRead.conversationId],
        set: {
          messageId,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Get last read message ID for a conversation
   */
  async getLastRead(
    ownerNodeNum: number,
    type: ConversationType,
    conversationId: string,
  ): Promise<number | null> {
    const result = await this.db
      .select({ messageId: lastRead.messageId })
      .from(lastRead)
      .where(
        and(
          eq(lastRead.ownerNodeNum, ownerNodeNum),
          eq(lastRead.type, type),
          eq(lastRead.conversationId, conversationId),
        ),
      )
      .limit(1);

    return result[0]?.messageId ?? null;
  }

  /**
   * Get unread count for a direct conversation
   * Only counts messages FROM the other party (not our own sent messages)
   * @param ownerNodeNum - The device owner's node number
   * @param myNodeNum - The current user's node number (always first in conversationId)
   * @param otherNodeNum - The other party's node number
   */
  async getUnreadCountDirect(
    ownerNodeNum: number,
    myNodeNum: number,
    otherNodeNum: number,
  ): Promise<number> {
    // Conversation ID format: myNodeNum:otherNodeNum (from user's perspective)
    const conversationId = `${myNodeNum}:${otherNodeNum}`;

    const lastReadId = await this.getLastRead(
      ownerNodeNum,
      "direct",
      conversationId,
    );

    if (!lastReadId) {
      // No read marker, count all messages FROM the other party
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.ownerNodeNum, ownerNodeNum),
            eq(messages.type, "direct"),
            // Only count messages FROM the other party
            eq(messages.fromNode, otherNodeNum),
            eq(messages.toNode, myNodeNum),
          ),
        );
      return result[0]?.count ?? 0;
    }

    // Count messages after last read, only FROM the other party
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.type, "direct"),
          // Only count messages FROM the other party
          eq(messages.fromNode, otherNodeNum),
          eq(messages.toNode, myNodeNum),
          gt(messages.id, lastReadId),
        ),
      );
    return result[0]?.count ?? 0;
  }

  /**
   * Get unread count for a channel
   * Only counts messages from other nodes (not our own sent messages)
   * @param ownerNodeNum - The device owner's node number
   * @param channelId - The channel ID
   * @param myNodeNum - Optional: if provided, excludes messages from this node
   */
  async getUnreadCountBroadcast(
    ownerNodeNum: number,
    channelId: number,
    myNodeNum?: number,
  ): Promise<number> {
    const conversationId = channelId.toString();
    const lastReadId = await this.getLastRead(
      ownerNodeNum,
      "channel",
      conversationId,
    );

    // Build base conditions
    const baseConditions = [
      eq(messages.ownerNodeNum, ownerNodeNum),
      eq(messages.type, "channel"),
      eq(messages.channelId, channelId),
    ];

    // Exclude own messages if myNodeNum provided
    if (myNodeNum !== undefined) {
      baseConditions.push(ne(messages.fromNode, myNodeNum));
    }

    if (!lastReadId) {
      // No read marker, count all messages (excluding own)
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(...baseConditions));
      return result[0]?.count ?? 0;
    }

    // Count messages after last read (excluding own)
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(...baseConditions, gt(messages.id, lastReadId)));
    return result[0]?.count ?? 0;
  }

  /**
   * Save or update a message draft
   */
  async saveDraft(
    ownerNodeNum: number,
    type: ConversationType,
    targetId: number,
    content: string,
  ): Promise<void> {
    await this.db
      .insert(messageDrafts)
      .values({
        ownerNodeNum,
        type,
        targetId,
        content,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          messageDrafts.ownerNodeNum,
          messageDrafts.type,
          messageDrafts.targetId,
        ],
        set: {
          content,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Get draft for a conversation
   */
  async getDraft(
    ownerNodeNum: number,
    type: ConversationType,
    targetId: number,
  ): Promise<MessageDraft | null> {
    const result = await this.db
      .select()
      .from(messageDrafts)
      .where(
        and(
          eq(messageDrafts.ownerNodeNum, ownerNodeNum),
          eq(messageDrafts.type, type),
          eq(messageDrafts.targetId, targetId),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Delete a draft
   */
  async deleteDraft(
    ownerNodeNum: number,
    type: ConversationType,
    targetId: number,
  ): Promise<void> {
    await this.db
      .delete(messageDrafts)
      .where(
        and(
          eq(messageDrafts.ownerNodeNum, ownerNodeNum),
          eq(messageDrafts.type, type),
          eq(messageDrafts.targetId, targetId),
        ),
      );
  }
}
