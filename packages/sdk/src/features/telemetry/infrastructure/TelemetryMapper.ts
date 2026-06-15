import type { PacketMetadata } from "../../../core/types.ts";
import type * as Protobuf from "@meshtastic/protobufs";
import type { TelemetryReading } from "../domain/TelemetryReading.ts";

export const TelemetryMapper = {
  fromPacket(packet: PacketMetadata<Protobuf.Telemetry.Telemetry>): TelemetryReading {
    return {
      nodeNum: packet.from,
      time: packet.rxTime,
      kind: packet.data.variant.case,
      value: packet.data.variant.value,
    };
  },
};
