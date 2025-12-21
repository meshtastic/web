import { AdminMessageService } from "@core/services/adminMessageService";
import type { Device } from "@state/device";
import { nodeRepo } from "@data/index";

export interface OutgoingMessage {
  text: string;
  to: number | "broadcast";
  channelId?: number;
  wantAck?: boolean;
}

export interface PipelineContext {
  device: Device;
  deviceId: number;
  myNodeNum?: number;
}

export type PipelineHandler = (
  message: OutgoingMessage,
  context: PipelineContext,
) => void | Promise<void>;

/**
 * Pipeline handler that automatically marks nodes as favorites when sending them a DM.
 * This sends an admin message to the device AND updates the local database.
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

  // Check if node exists and is not already favorited
  const node = await nodeRepo.getNode(context.deviceId, recipientNodeNum);
  if (!node) {
    return;
  }

  // Only update if not already favorited
  if (!node.isFavorite) {
    // Send admin message to device AND update local database
    await AdminMessageService.setFavoriteNode(
      context.device,
      context.deviceId,
      recipientNodeNum,
      true,
    );
  }
};
