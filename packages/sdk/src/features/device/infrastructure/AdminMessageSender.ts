import { create, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import {
  ChannelNumber,
  type Destination,
  type PacketError,
} from "../../../core/types.ts";

const isBadSessionKey = (e: unknown): boolean =>
  (e as PacketError | undefined)?.error ===
  Protobuf.Mesh.Routing_Error.ADMIN_BAD_SESSION_KEY;

/**
 * Builds an AdminMessage from a payload variant and sends it over the ADMIN_APP
 * portnum. Shared by config, channels, nodes, position, and device slices so
 * the plumbing is not duplicated across 15+ use-cases.
 *
 * Stamps the destination's session passkey when one is cached. If the node
 * rejects it with ADMIN_BAD_SESSION_KEY, asks the node for a fresh passkey
 * and retries once.
 */
export async function sendAdminMessage(
  client: MeshClient,
  payloadVariant: Protobuf.Admin.AdminMessage["payloadVariant"],
  destination: Destination = "self",
  channel: ChannelNumber = ChannelNumber.Primary,
  wantAck = true,
  wantResponse = true,
): Promise<number> {
  const nodeNum =
    destination === "self"
      ? client.myNodeNum
      : destination === "broadcast"
        ? undefined
        : destination;

  const send = () => {
    const message = create(Protobuf.Admin.AdminMessageSchema, {
      payloadVariant,
      sessionPasskey:
        nodeNum === undefined ? undefined : client.device.session.get(nodeNum),
    });
    return client.sendPacket(
      toBinary(Protobuf.Admin.AdminMessageSchema, message),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      destination,
      channel,
      wantAck,
      wantResponse,
    );
  };

  try {
    return await send();
  } catch (e) {
    if (nodeNum === undefined || !isBadSessionKey(e)) throw e;
    client.device.session.forget(nodeNum);
    if (!(await refreshSession(client, nodeNum, channel))) throw e;
    return send();
  }
}

/**
 * Ask a node for something cheap that it answers with a fresh passkey, and
 * wait for it. The local node is asked for its owner and remote nodes for
 * their metadata, as the Android app does.
 */
async function refreshSession(
  client: MeshClient,
  nodeNum: number,
  channel: ChannelNumber,
): Promise<boolean> {
  const arrived = client.device.session.waitFor(nodeNum);
  const request: Protobuf.Admin.AdminMessage["payloadVariant"] =
    nodeNum === client.myNodeNum
      ? { case: "getOwnerRequest", value: true }
      : { case: "getDeviceMetadataRequest", value: true };
  const message = create(Protobuf.Admin.AdminMessageSchema, {
    payloadVariant: request,
  });
  client
    .sendPacket(
      toBinary(Protobuf.Admin.AdminMessageSchema, message),
      Protobuf.Portnums.PortNum.ADMIN_APP,
      nodeNum,
      channel,
    )
    .catch(() => {
      // The response, not the ack, is what carries the passkey.
    });
  return arrived;
}
