import { and, desc, eq, gt, or, sql } from "drizzle-orm";
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

  /**
   * Get direct messages between two nodes
   */
  async getDirectMessages(
    deviceId: number,
    nodeA: number,
    nodeB: number,
    limit = 50,
  ): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.deviceId, deviceId),
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
    deviceId: number,
    channelId: number,
    limit = 50,
  ): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.deviceId, deviceId),
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
    deviceId: number,
    limit = 100,
    offset = 0,
  ): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.deviceId, deviceId))
      .orderBy(desc(messages.date))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Save a new message
   */
  async saveMessage(message: NewMessage): Promise<void> {
    await this.db.insert(messages).values(message);
  }

  /**
   * Update message state by database ID
   */
  async updateMessageState(
    id: number,
    deviceId: number,
    newState: Message["state"],
  ): Promise<void> {
    await this.db
      .update(messages)
      .set({ state: newState })
      .where(and(eq(messages.id, id), eq(messages.deviceId, deviceId)));
  }

  /**
   * Update message state by packet messageId
   */
  async updateMessageStateByMessageId(
    messageId: number,
    deviceId: number,
    newState: Message["state"],
  ): Promise<void> {
    await this.db
      .update(messages)
      .set({ state: newState })
      .where(
        and(eq(messages.messageId, messageId), eq(messages.deviceId, deviceId)),
      );
  }

  /**
   * Increment retry count for a message
   */
  async incrementRetryCount(
    messageId: number,
    deviceId: number,
  ): Promise<void> {
    await this.db
      .update(messages)
      .set({ retryCount: sql`${messages.retryCount} + 1` })
      .where(and(eq(messages.id, messageId), eq(messages.deviceId, deviceId)));
  }

  /**
   * Update message ACK status
   */
  async updateMessageAck(
    messageId: number,
    deviceId: number,
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
      .where(and(eq(messages.id, messageId), eq(messages.deviceId, deviceId)));
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: number, deviceId: number): Promise<void> {
    await this.db
      .delete(messages)
      .where(and(eq(messages.id, messageId), eq(messages.deviceId, deviceId)));
  }

  /**
   * Delete all messages for a conversation
   */
  async deleteConversation(
    deviceId: number,
    nodeA: number,
    nodeB: number,
  ): Promise<void> {
    await this.db
      .delete(messages)
      .where(
        and(
          eq(messages.deviceId, deviceId),
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
    deviceId: number,
    channelId: number,
  ): Promise<void> {
    await this.db
      .delete(messages)
      .where(
        and(
          eq(messages.deviceId, deviceId),
          eq(messages.type, "channel"),
          eq(messages.channelId, channelId),
        ),
      );
  }

  /**
   * Delete all messages for a device
   */
  async deleteAllMessages(deviceId: number): Promise<void> {
    await this.db.delete(messages).where(eq(messages.deviceId, deviceId));
  }

  /**
   * Get unacked/failed messages for retry
   */
  async getPendingMessages(deviceId: number): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.deviceId, deviceId),
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
  async getMessageCount(deviceId: number): Promise<number> {
    const result = await this.db
      .select()
      .from(messages)
      .where(eq(messages.deviceId, deviceId));
    return result.length;
  }

  /**
   * Get conversations list with last message and unread counts
   * Returns both direct conversations and channel conversations
   * @param myNodeNum - The current user's node number (needed for unread count calculations)
   */
  async getConversations(
    deviceId: number,
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
      .where(and(eq(messages.deviceId, deviceId), eq(messages.type, "direct")))
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
          eq(messages.deviceId, deviceId),
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
      .where(and(eq(messages.deviceId, deviceId), eq(messages.type, "channel")))
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
          eq(messages.deviceId, deviceId),
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
        deviceId,
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
        deviceId,
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
    deviceId: number,
    type: ConversationType,
    conversationId: string,
    messageId: number,
  ): Promise<void> {
    await this.db
      .insert(lastRead)
      .values({
        deviceId,
        type,
        conversationId,
        messageId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [lastRead.deviceId, lastRead.type, lastRead.conversationId],
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
    deviceId: number,
    type: ConversationType,
    conversationId: string,
  ): Promise<number | null> {
    const result = await this.db
      .select({ messageId: lastRead.messageId })
      .from(lastRead)
      .where(
        and(
          eq(lastRead.deviceId, deviceId),
          eq(lastRead.type, type),
          eq(lastRead.conversationId, conversationId),
        ),
      )
      .limit(1);

    return result[0]?.messageId ?? null;
  }

  /**
   * Get unread count for a direct conversation
   * @param myNodeNum - The current user's node number (always first in conversationId)
   * @param otherNodeNum - The other party's node number
   */
  async getUnreadCountDirect(
    deviceId: number,
    myNodeNum: number,
    otherNodeNum: number,
  ): Promise<number> {
    // Conversation ID format: myNodeNum:otherNodeNum (from user's perspective)
    const conversationId = `${myNodeNum}:${otherNodeNum}`;

    const lastReadId = await this.getLastRead(
      deviceId,
      "direct",
      conversationId,
    );

    if (!lastReadId) {
      // No read marker, all messages are unread
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.deviceId, deviceId),
            eq(messages.type, "direct"),
            or(
              and(
                eq(messages.fromNode, myNodeNum),
                eq(messages.toNode, otherNodeNum),
              ),
              and(
                eq(messages.fromNode, otherNodeNum),
                eq(messages.toNode, myNodeNum),
              ),
            ),
          ),
        );
      return result[0]?.count ?? 0;
    }

    // Count messages after last read
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.deviceId, deviceId),
          eq(messages.type, "direct"),
          or(
            and(
              eq(messages.fromNode, myNodeNum),
              eq(messages.toNode, otherNodeNum),
            ),
            and(
              eq(messages.fromNode, otherNodeNum),
              eq(messages.toNode, myNodeNum),
            ),
          ),
          gt(messages.id, lastReadId),
        ),
      );
    return result[0]?.count ?? 0;
  }

  /**
   * Get unread count for a channel channel
   */
  async getUnreadCountBroadcast(
    deviceId: number,
    channelId: number,
  ): Promise<number> {
    const conversationId = channelId.toString();
    const lastReadId = await this.getLastRead(
      deviceId,
      "channel",
      conversationId,
    );

    if (!lastReadId) {
      // No read marker, all messages are unread
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.deviceId, deviceId),
            eq(messages.type, "channel"),
            eq(messages.channelId, channelId),
          ),
        );
      return result[0]?.count ?? 0;
    }

    // Count messages after last read
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.deviceId, deviceId),
          eq(messages.type, "channel"),
          eq(messages.channelId, channelId),
          gt(messages.id, lastReadId),
        ),
      );
    return result[0]?.count ?? 0;
  }

  /**
   * Save or update a message draft
   */
  async saveDraft(
    deviceId: number,
    type: ConversationType,
    targetId: number,
    content: string,
  ): Promise<void> {
    await this.db
      .insert(messageDrafts)
      .values({
        deviceId,
        type,
        targetId,
        content,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          messageDrafts.deviceId,
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
    deviceId: number,
    type: ConversationType,
    targetId: number,
  ): Promise<MessageDraft | null> {
    const result = await this.db
      .select()
      .from(messageDrafts)
      .where(
        and(
          eq(messageDrafts.deviceId, deviceId),
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
    deviceId: number,
    type: ConversationType,
    targetId: number,
  ): Promise<void> {
    await this.db
      .delete(messageDrafts)
      .where(
        and(
          eq(messageDrafts.deviceId, deviceId),
          eq(messageDrafts.type, type),
          eq(messageDrafts.targetId, targetId),
        ),
      );
  }
}
