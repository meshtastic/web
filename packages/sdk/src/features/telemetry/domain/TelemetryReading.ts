import type * as Protobuf from "@meshtastic/protobufs";

export type TelemetryKind = Protobuf.Telemetry.Telemetry["variant"]["case"];

export interface TelemetryReading {
  readonly nodeNum: number;
  readonly time: Date;
  readonly kind: TelemetryKind;
  readonly value: Protobuf.Telemetry.Telemetry["variant"]["value"];
}
