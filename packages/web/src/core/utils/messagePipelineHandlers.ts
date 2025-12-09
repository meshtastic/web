import { nodeRepo } from "@db/index";

export interface OutgoingMessage {
  text: string;
  to: number | "broadcast";
  channelId?: number;
  wantAck?: boolean;
}

export interface PipelineContext {
  deviceId: number;
  myNodeNum?: number;
}

export type PipelineHandler = (
  message: OutgoingMessage,
  context: PipelineContext,
) => void | Promise<void>;

/**
 * Pipeline handler that automatically marks nodes as favorites when sending them a DM.
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

  // Check if node exists and is not already favorited
  const node = await nodeRepo.getNode(context.deviceId, recipientNodeNum);
  if (!node) {
    console.warn(
      `[autoFavoriteDMHandler] Node ${recipientNodeNum} not found in database`,
    );
    return;
  }

  // Only update if not already favorited
  if (!node.isFavorite) {
    await nodeRepo.updateFavorite(context.deviceId, recipientNodeNum, true);
    console.log(
      `[autoFavoriteDMHandler] Node ${recipientNodeNum} marked as favorite`,
    );
  } else {
    console.log(
      `[autoFavoriteDMHandler] Node ${recipientNodeNum} already favorited`,
    );
  }
};
