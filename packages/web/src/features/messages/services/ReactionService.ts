import { deviceCommands } from "@core/services/DeviceCommandService";
import logger from "@core/services/logger";
import { reactionRepo } from "@data/repositories";
import type { Types } from "@meshtastic/core";

const STORAGE_KEY = "recentReactionEmojis";
const DEFAULT_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];
const MAX_RECENT = 5;

/**
 * Service for handling message reactions
 * Manages sending reactions, toggling reactions, and tracking recently used emojis
 */
class ReactionServiceClass {
  private recentEmojis: string[] = [];

  constructor() {
    this.loadRecentFromStorage();
  }

  /**
   * Get the last 5 recently used emojis
   * Falls back to defaults if no recent emojis exist
   */
  getRecentEmojis(): string[] {
    if (this.recentEmojis.length === 0) {
      return DEFAULT_EMOJIS;
    }
    return this.recentEmojis;
  }

  /**
   * Track emoji usage - moves the emoji to the front of recent list
   */
  trackEmojiUsage(emoji: string): void {
    // Remove if already exists, then add to front
    this.recentEmojis = [
      emoji,
      ...this.recentEmojis.filter((e) => e !== emoji),
    ].slice(0, MAX_RECENT);
    this.saveRecentToStorage();
  }

  /**
   * Send a reaction to a message
   * This adds the reaction locally and sends it over the mesh
   */
  async sendReaction(
    ownerNodeNum: number,
    targetMessageId: number,
    emoji: string,
    destination: number | "broadcast",
    channel?: Types.ChannelNumber,
  ): Promise<void> {
    logger.debug(
      `[ReactionService] Sending reaction ${emoji} to message ${targetMessageId}`,
    );

    // Track emoji usage for quick reactions
    this.trackEmojiUsage(emoji);

    // Add reaction locally (optimistic update)
    await reactionRepo.addReaction({
      ownerNodeNum,
      targetMessageId,
      fromNode: ownerNodeNum, // We're sending, so fromNode is us
      emoji,
      createdAt: new Date(),
    });

    // Send over mesh
    try {
      await deviceCommands.sendReaction(
        targetMessageId,
        emoji,
        destination,
        channel,
      );
    } catch (error) {
      logger.error("[ReactionService] Failed to send reaction:", error);
      // Could remove the optimistic update here, but for now we leave it
    }
  }

  /**
   * Toggle a reaction (add if not present, remove if present)
   * @returns true if added, false if removed
   */
  async toggleReaction(
    ownerNodeNum: number,
    targetMessageId: number,
    emoji: string,
    destination: number | "broadcast",
    channel?: Types.ChannelNumber,
  ): Promise<boolean> {
    logger.debug(
      `[ReactionService] Toggling reaction ${emoji} on message ${targetMessageId}`,
    );

    // Track emoji usage
    this.trackEmojiUsage(emoji);

    // Toggle in database
    const wasAdded = await reactionRepo.toggleReaction({
      ownerNodeNum,
      targetMessageId,
      fromNode: ownerNodeNum,
      emoji,
      createdAt: new Date(),
    });

    // Send over mesh (same message acts as toggle on receiving end)
    try {
      await deviceCommands.sendReaction(
        targetMessageId,
        emoji,
        destination,
        channel,
      );
    } catch (error) {
      logger.error("[ReactionService] Failed to send reaction toggle:", error);
    }

    return wasAdded;
  }

  /**
   * Remove a reaction
   */
  async removeReaction(
    ownerNodeNum: number,
    targetMessageId: number,
    emoji: string,
    destination: number | "broadcast",
    channel?: Types.ChannelNumber,
  ): Promise<void> {
    logger.debug(
      `[ReactionService] Removing reaction ${emoji} from message ${targetMessageId}`,
    );

    // Remove from database
    await reactionRepo.removeReaction(
      ownerNodeNum,
      targetMessageId,
      ownerNodeNum, // fromNode is us
      emoji,
    );

    // Send over mesh to notify others
    // Note: The protocol may not have a "remove" concept, sending the same emoji again may toggle
    try {
      await deviceCommands.sendReaction(
        targetMessageId,
        emoji,
        destination,
        channel,
      );
    } catch (error) {
      logger.error("[ReactionService] Failed to send reaction removal:", error);
    }
  }

  private loadRecentFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.recentEmojis = parsed.slice(0, MAX_RECENT);
        }
      }
    } catch (error) {
      logger.warn(
        "[ReactionService] Failed to load recent emojis from storage:",
        error,
      );
    }
  }

  private saveRecentToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.recentEmojis));
    } catch (error) {
      logger.warn(
        "[ReactionService] Failed to save recent emojis to storage:",
        error,
      );
    }
  }
}

export const ReactionService = new ReactionServiceClass();
