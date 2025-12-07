import { useNodeDBStore } from "@core/stores/nodeDBStore";
import type {
  OutgoingMessage,
  PipelineContext,
  PipelineHandler,
} from "./types";

/**
 * Pipeline handler that automatically marks nodes as favorites when sending them a DM.
 * This fulfills the business requirement that DM recipients should be automatically favorited.
 */
export const autoFavoriteDMHandler: PipelineHandler = async (
  message: OutgoingMessage,
  context: PipelineContext,
) => {
  // Only process direct messages
  if (typeof message.to !== "number") {
    return;
  }

  const recipientNodeNum = message.to;

  // Don't favorite ourselves
  if (context.myNodeNum && recipientNodeNum === context.myNodeNum) {
    return;
  }

  console.log(
    `[autoFavoriteDMHandler] Auto-favoriting node ${recipientNodeNum} for DM`,
  );

  // Get the nodeDB for this device
  const nodeDB = useNodeDBStore.getState().getNodeDB(context.deviceId);
  if (!nodeDB) {
    console.warn(
      `[autoFavoriteDMHandler] No nodeDB found for device ${context.deviceId}`,
    );
    return;
  }

  // Check if node exists and is not already favorited
  const node = nodeDB.getNode(recipientNodeNum);
  if (!node) {
    console.warn(
      `[autoFavoriteDMHandler] Node ${recipientNodeNum} not found in nodeDB`,
    );
    return;
  }

  // Only update if not already favorited
  if (!node.isFavorite) {
    nodeDB.updateFavorite(recipientNodeNum, true);
    console.log(
      `[autoFavoriteDMHandler] Node ${recipientNodeNum} marked as favorite`,
    );
  } else {
    console.log(
      `[autoFavoriteDMHandler] Node ${recipientNodeNum} already favorited`,
    );
  }
};

/**
 * Example handler for logging outgoing messages.
 * Can be used for debugging or analytics.
 */
export const loggingHandler: PipelineHandler = async (
  message: OutgoingMessage,
  context: PipelineContext,
) => {
  const isDirect = typeof message.to === "number";
  console.log("[loggingHandler] Outgoing message:", {
    type: isDirect ? "Direct" : "Broadcast",
    to: message.to,
    channelId: message.channelId,
    textLength: message.text.length,
    deviceId: context.deviceId,
    myNodeNum: context.myNodeNum,
  });
};
