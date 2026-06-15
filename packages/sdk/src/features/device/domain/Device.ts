import type * as Protobuf from "@meshtastic/protobufs";

/**
 * Aggregate representing a single connected device — its identity, status,
 * and hardware metadata.
 */
export interface Device {
  readonly myNodeNum: number;
  readonly hwModel?: Protobuf.Mesh.HardwareModel;
  readonly rebootCount?: number;
  readonly firmwareVersion?: string;
  readonly metadata?: Protobuf.Mesh.DeviceMetadata;
}
