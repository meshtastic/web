import { nodeRepo } from "@data/repositories";
import { adminCommands } from "./adminCommands";
import logger from "./logger";
import { registerSendHook, type OutgoingMessage } from "./messageHooks";

/**
 * Setup Message Hooks
 *
 * Registers all default message hooks at app startup.
 * This file is the central place to add new message lifecycle behaviors.
 */

let initialized = false;

// ============================================================================
// Send Hooks
// ============================================================================

/**
 * Auto-favorite nodes when sending them a direct message
 */
async function autoFavoriteOnDM(
  message: OutgoingMessage,
  myNodeNum: number,
): Promise<void> {
  // Only process direct messages (not broadcast)
  if (typeof message.to !== "number") {
    return;
  }

  const recipientNodeNum = message.to;

  // Don't favorite ourselves
  if (recipientNodeNum === myNodeNum) {
    return;
  }

  // Check if node exists and is not already favorited
  const node = await nodeRepo.getNode(myNodeNum, recipientNodeNum);
  if (!node) {
    return;
  }

  // Only update if not already favorited
  if (!node.isFavorite) {
    logger.debug(
      `[MessageHooks] Auto-favoriting node ${recipientNodeNum} after DM`,
    );

    try {
      await adminCommands.setFavoriteNode(recipientNodeNum, true);
    } catch (error) {
      // Log but don't fail - this is a nice-to-have feature
      logger.warn(
        `[MessageHooks] Failed to auto-favorite node ${recipientNodeNum}:`,
        error,
      );
    }
  }
}

// ============================================================================
// Receive Hooks
// ============================================================================

// Future receive hooks can be added here

// ============================================================================
// ACK Hooks
// ============================================================================

// Future ACK hooks can be added here

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize all message hooks
 * Should be called once at app startup
 */
export function setupMessageHooks(): void {
  if (initialized) {
    logger.warn("[MessageHooks] Already initialized, skipping");
    return;
  }

  logger.info("[MessageHooks] Initializing message hooks...");

  // Register send hooks
  registerSendHook(autoFavoriteOnDM);

  // Register receive hooks
  // (none yet)

  // Register ACK hooks
  // (none yet)

  initialized = true;
  logger.info("[MessageHooks] Message hooks initialized");
}
