import type { PacketMetadata } from "../../../core/types.ts";
import type * as Protobuf from "@meshtastic/protobufs";
import type { Position } from "../domain/Position.ts";

export const PositionMapper = {
  fromPacket(packet: PacketMetadata<Protobuf.Mesh.Position>): Position {
    return {
      nodeNum: packet.from,
      latitudeI: packet.data.latitudeI,
      longitudeI: packet.data.longitudeI,
      altitude: packet.data.altitude,
      time: packet.rxTime,
    };
  },
};
