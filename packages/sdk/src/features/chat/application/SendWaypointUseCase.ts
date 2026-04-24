import { toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { Result } from "better-result";
import type { ResultType } from "better-result";
import type { MeshClient } from "../../../core/client/MeshClient.ts";
import { generatePacketId } from "../../../core/identifiers/PacketId.ts";
import { ChannelNumber, type Destination, Emitter } from "../../../core/types.ts";

export async function sendWaypoint(
  client: MeshClient,
  waypoint: Protobuf.Mesh.Waypoint,
  destination: Destination,
  channel: ChannelNumber = ChannelNumber.Primary,
): Promise<ResultType<number, Error>> {
  client.log.debug(
    Emitter[Emitter.SendWaypoint],
    `📤 Sending waypoint to ${destination} on channel ${channel}`,
  );

  waypoint.id = generatePacketId();

  try {
    const id = await client.sendPacket(
      toBinary(Protobuf.Mesh.WaypointSchema, waypoint),
      Protobuf.Portnums.PortNum.WAYPOINT_APP,
      destination,
      channel,
      true,
      false,
    );
    return Result.ok(id);
  } catch (e) {
    return Result.err(e instanceof Error ? e : new Error(String(e)));
  }
}
