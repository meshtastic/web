import { AdminMessageService } from "@core/services/adminMessageService";
import { nodeRepo } from "@data/index";
import { useDeviceStore } from "@state/index.ts";

export interface OutgoingMessage {
  text: string;
  to: number | "broadcast";
  channelId?: number;
  wantAck?: boolean;
}

/**
 * Pipeline handler that automatically marks nodes as favorites when sending them a DM.
 * This sends an admin message to the device AND updates the local database.
 */
export async function autoFavoriteDMHandler(
  message: OutgoingMessage,
  myNodeNum: number,
): Promise<void> {
  // Only process direct messages
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
    // Get the active device from the store
    const store = useDeviceStore.getState();
    const device = store.getDevice(store.activeDeviceId);
    if (!device) {
      return;
    }

    // Send admin message to device AND update local database
    await AdminMessageService.setFavoriteNode(
      device,
      myNodeNum,
      recipientNodeNum,
      true,
    );
  }
}
