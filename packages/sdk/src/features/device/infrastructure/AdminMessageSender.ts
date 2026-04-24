import { create, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { ChannelNumber, type Destination } from "../../../core/types.ts";

/**
 * Builds an AdminMessage from a payload variant and sends it over the ADMIN_APP
 * portnum. Shared by config, channels, nodes, position, and device slices so
 * the plumbing is not duplicated across 15+ use-cases.
 */
export function sendAdminMessage(
  client: MeshClient,
  payloadVariant: Protobuf.Admin.AdminMessage["payloadVariant"],
  destination: Destination = "self",
  channel: ChannelNumber = ChannelNumber.Primary,
  wantAck = true,
  wantResponse = true,
): Promise<number> {
  const message = create(Protobuf.Admin.AdminMessageSchema, { payloadVariant });
  return client.sendPacket(
    toBinary(Protobuf.Admin.AdminMessageSchema, message),
    Protobuf.Portnums.PortNum.ADMIN_APP,
    destination,
    channel,
    wantAck,
    wantResponse,
  );
}
