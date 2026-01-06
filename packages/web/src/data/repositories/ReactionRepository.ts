import { and, eq, inArray } from "drizzle-orm";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { dbClient } from "../client.ts";
import {
  messageReactions,
  type NewReaction,
  type Reaction,
} from "../schema.ts";

export class ReactionRepository {
  private get db() {
    return dbClient.db;
  }

  getClient(client?: SQLocalDrizzle) {
    return client ?? dbClient.client;
  }

  async addReaction(reaction: NewReaction): Promise<void> {
    await this.db
      .insert(messageReactions)
      .values(reaction)
      .onConflictDoNothing();
  }

  async removeReaction(
    ownerNodeNum: number,
    targetMessageId: number,
    fromNode: number,
    emoji: string,
  ): Promise<void> {
    await this.db
      .delete(messageReactions)
      .where(
        and(
          eq(messageReactions.ownerNodeNum, ownerNodeNum),
          eq(messageReactions.targetMessageId, targetMessageId),
          eq(messageReactions.fromNode, fromNode),
          eq(messageReactions.emoji, emoji),
        ),
      );
  }

  async toggleReaction(reaction: NewReaction): Promise<boolean> {
    const existing = await this.db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.ownerNodeNum, reaction.ownerNodeNum),
          eq(messageReactions.targetMessageId, reaction.targetMessageId),
          eq(messageReactions.fromNode, reaction.fromNode),
          eq(messageReactions.emoji, reaction.emoji),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await this.removeReaction(
        reaction.ownerNodeNum,
        reaction.targetMessageId,
        reaction.fromNode,
        reaction.emoji,
      );
      return false;
    }

    await this.addReaction(reaction);
    return true;
  }

  async hasReaction(
    ownerNodeNum: number,
    targetMessageId: number,
    fromNode: number,
    emoji: string,
  ): Promise<boolean> {
    const result = await this.db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.ownerNodeNum, ownerNodeNum),
          eq(messageReactions.targetMessageId, targetMessageId),
          eq(messageReactions.fromNode, fromNode),
          eq(messageReactions.emoji, emoji),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  async getReactionsForMessage(
    ownerNodeNum: number,
    targetMessageId: number,
  ): Promise<Reaction[]> {
    return this.db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.ownerNodeNum, ownerNodeNum),
          eq(messageReactions.targetMessageId, targetMessageId),
        ),
      );
  }

  async getReactionsForMessages(
    ownerNodeNum: number,
    messageIds: number[],
  ): Promise<Map<number, Reaction[]>> {
    if (messageIds.length === 0) {
      return new Map();
    }

    const reactions = await this.db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.ownerNodeNum, ownerNodeNum),
          inArray(messageReactions.targetMessageId, messageIds),
        ),
      );

    const reactionMap = new Map<number, Reaction[]>();
    for (const reaction of reactions) {
      const existing = reactionMap.get(reaction.targetMessageId) ?? [];
      existing.push(reaction);
      reactionMap.set(reaction.targetMessageId, existing);
    }

    return reactionMap;
  }

  buildReactionsQuery(ownerNodeNum: number, targetMessageId: number) {
    return this.db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.ownerNodeNum, ownerNodeNum),
          eq(messageReactions.targetMessageId, targetMessageId),
        ),
      );
  }

  buildReactionsForMessagesQuery(ownerNodeNum: number, messageIds: number[]) {
    return this.db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.ownerNodeNum, ownerNodeNum),
          inArray(messageReactions.targetMessageId, messageIds),
        ),
      );
  }
}
