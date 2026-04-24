import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { ChannelNumber } from "../../../core/types.ts";
import { sendAdminMessage } from "../infrastructure/AdminMessageSender.ts";

export function getMetadata(client: MeshClient, nodeNum: number): Promise<number> {
  return sendAdminMessage(
    client,
    { case: "getDeviceMetadataRequest", value: true },
    nodeNum,
    ChannelNumber.Admin,
  );
}
