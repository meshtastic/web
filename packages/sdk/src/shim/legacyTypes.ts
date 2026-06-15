/**
 * Backwards-compatible re-export of the cross-cutting types under the
 * `Types` namespace. mod.ts already exports `Types` directly from
 * `core/types.ts`; this file is no longer wired anywhere but is kept as a
 * stable import path for any third-party that grabbed it via the published
 * dist.
 */
export type {
  Destination,
  DeviceOutput,
  HttpRetryConfig,
  LogEvent,
  LogEventPacket,
  PacketDestination,
  PacketError,
  PacketMetadata,
  QueueItem,
  Transport,
} from "../core/types.ts";
export { ChannelNumber, DeviceStatusEnum, Emitter, EmitterScope } from "../core/types.ts";
