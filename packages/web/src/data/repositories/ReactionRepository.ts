import { and, eq, inArray } from "drizzle-orm";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import logger from "../../core/services/logger.ts";
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
    logger.debug(
      `[ReactionRepo] Adding reaction: owner=${reaction.ownerNodeNum}, target=${reaction.targetMessageId}, from=${reaction.fromNode}, emoji=${reaction.emoji}`,
    );
    try {
      const result = await this.db
        .insert(messageReactions)
        .values(reaction)
        .onConflictDoNothing();
      logger.debug(`[ReactionRepo] Insert result:`, result);
    } catch (error) {
      logger.error(`[ReactionRepo] Failed to add reaction:`, error);
      throw error;
    }
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
    logger.debug(
      `[ReactionRepo] Toggle reaction: owner=${reaction.ownerNodeNum}, target=${reaction.targetMessageId}, from=${reaction.fromNode}, emoji=${reaction.emoji}`,
    );
    try {
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

      logger.debug(
        `[ReactionRepo] Existing reactions found: ${existing.length}`,
      );

      if (existing.length > 0) {
        await this.removeReaction(
          reaction.ownerNodeNum,
          reaction.targetMessageId,
          reaction.fromNode,
          reaction.emoji,
        );
        logger.debug(`[ReactionRepo] Removed existing reaction`);
        return false;
      }

      await this.addReaction(reaction);
      logger.debug(`[ReactionRepo] Added new reaction`);

      // Verify the insert worked by querying immediately
      const verify = await this.db
        .select()
        .from(messageReactions)
        .where(
          and(
            eq(messageReactions.ownerNodeNum, reaction.ownerNodeNum),
            eq(messageReactions.targetMessageId, reaction.targetMessageId),
          ),
        );
      logger.debug(
        `[ReactionRepo] Verification query returned ${verify.length} reactions for message ${reaction.targetMessageId}`,
      );

      return true;
    } catch (error) {
      logger.error(`[ReactionRepo] Toggle reaction failed:`, error);
      throw error;
    }
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
