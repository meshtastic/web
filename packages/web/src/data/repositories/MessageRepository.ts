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

export class MessageRepository {
  private get db() {
    return dbClient.db;
  }

  getClient(client?: SQLocalDrizzle) {
    return client ?? dbClient.client;
  }

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

  buildAllMessagesQuery(ownerNodeNum: number, limit = 100, offset = 0) {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.ownerNodeNum, ownerNodeNum))
      .orderBy(desc(messages.date))
      .limit(limit)
      .offset(offset);
  }

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

  buildLastReadQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(lastRead)
      .where(eq(lastRead.ownerNodeNum, ownerNodeNum));
  }

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

  createMessageIdMap(messageList: Message[]): Map<number, Message> {
    const map = new Map<number, Message>();
    for (const msg of messageList) {
      map.set(msg.messageId, msg);
    }
    return map;
  }

  async saveMessage(message: NewMessage): Promise<void> {
    logger.debug(
      `[MessageRepo] saveMessage: ownerNodeNum=${message.ownerNodeNum}, type=${message.type}, channelId=${message.channelId}, from=${message.fromNode}`,
    );
    await this.db.insert(messages).values(message);
  }

  async updateMessageState(
    id: number,
    ownerNodeNum: number,
    newState: Message["state"],
  ): Promise<void> {
    await this.db
      .update(messages)
      .set({
        state: newState,
        updatedAt: new Date(),
      })
      .where(and(eq(messages.id, id), eq(messages.ownerNodeNum, ownerNodeNum)));
  }

  async updateMessageStateByMessageId(
    messageId: number,
    ownerNodeNum: number,
    newState: Message["state"],
  ): Promise<void> {
    await this.db
      .update(messages)
      .set({
        state: newState,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(messages.messageId, messageId),
          eq(messages.ownerNodeNum, ownerNodeNum),
        ),
      );
  }

  async incrementRetryCount(
    messageId: number,
    ownerNodeNum: number,
  ): Promise<void> {
    await this.db
      .update(messages)
      .set({
        retryCount: sql`${messages.retryCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.ownerNodeNum, ownerNodeNum),
        ),
      );
  }

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
      .set({
        ...ackData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.ownerNodeNum, ownerNodeNum),
        ),
      );
  }

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

  async deleteAllMessages(ownerNodeNum: number): Promise<void> {
    await this.db
      .delete(messages)
      .where(eq(messages.ownerNodeNum, ownerNodeNum));
  }

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

  async getMessageCount(ownerNodeNum: number): Promise<number> {
    const result = await this.db
      .select()
      .from(messages)
      .where(eq(messages.ownerNodeNum, ownerNodeNum));
    return result.length;
  }

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

    for (const row of directMessages) {
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

    conversations.sort((a, b) => {
      const aDate = a.lastMessage?.date?.getTime() || 0;
      const bDate = b.lastMessage?.date?.getTime() || 0;
      return bDate - aDate;
    });

    return conversations;
  }

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

  async getUnreadCountDirect(
    ownerNodeNum: number,
    myNodeNum: number,
    otherNodeNum: number,
  ): Promise<number> {
    const conversationId = `${myNodeNum}:${otherNodeNum}`;

    const lastReadId = await this.getLastRead(
      ownerNodeNum,
      "direct",
      conversationId,
    );

    if (!lastReadId) {
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.ownerNodeNum, ownerNodeNum),
            eq(messages.type, "direct"),
            eq(messages.fromNode, otherNodeNum),
            eq(messages.toNode, myNodeNum),
          ),
        );
      return result[0]?.count ?? 0;
    }

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.ownerNodeNum, ownerNodeNum),
          eq(messages.type, "direct"),
          eq(messages.fromNode, otherNodeNum),
          eq(messages.toNode, myNodeNum),
          gt(messages.id, lastReadId),
        ),
      );
    return result[0]?.count ?? 0;
  }

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

    const baseConditions = [
      eq(messages.ownerNodeNum, ownerNodeNum),
      eq(messages.type, "channel"),
      eq(messages.channelId, channelId),
    ];

    if (myNodeNum !== undefined) {
      baseConditions.push(ne(messages.fromNode, myNodeNum));
    }

    if (!lastReadId) {
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(...baseConditions));
      return result[0]?.count ?? 0;
    }

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(...baseConditions, gt(messages.id, lastReadId)));
    return result[0]?.count ?? 0;
  }

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
