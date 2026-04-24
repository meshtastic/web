/**
 * Phase-A compatibility shim: forwards the legacy `Types` namespace from
 * `@meshtastic/core` so `import { Types } from "@meshtastic/sdk"` sees the
 * same shape. Removed in Phase C.
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
