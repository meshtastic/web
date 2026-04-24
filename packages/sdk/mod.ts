// Main entry
export { MeshClient } from "./src/core/client/MeshClient.ts";
export type { MeshClientOptions } from "./src/core/client/MeshClient.ts";

// Constants & errors
export { Constants } from "./src/core/constants/index.ts";
export {
  MeshError,
  PacketTooLargeError,
  TransportClosedError,
} from "./src/core/errors/MeshError.ts";

// Shared signal primitives
export { createStore, SignalMap, toReadonly } from "./src/core/signals/createStore.ts";
export type { ReadonlySignal } from "./src/core/signals/createStore.ts";

// Logging
export { createLogger } from "./src/core/logging/logger.ts";

// Identifiers
export { generatePacketId } from "./src/core/identifiers/PacketId.ts";

// Event bus (advanced consumers)
export { EventBus } from "./src/core/event-bus/EventBus.ts";

// Transport interface
export type { DeviceOutput, HttpRetryConfig, Transport } from "./src/core/transport/Transport.ts";
export { DeviceStatusEnum } from "./src/core/transport/Transport.ts";

// Commonly-used runtime enums exported directly for ergonomic access.
export { ChannelNumber, Emitter, EmitterScope } from "./src/core/types.ts";
export type {
  Destination,
  LogEvent,
  LogEventPacket,
  PacketDestination,
  PacketError,
  PacketMetadata,
  QueueItem,
} from "./src/core/types.ts";

// Cross-cutting types kept under the Types namespace for consumers that
// already reference legacy enums/interfaces.
export * as Types from "./src/core/types.ts";

// Protobuf (re-export)
export * as Protobuf from "@meshtastic/protobufs";

// Feature slice clients + domain types
export { DeviceClient } from "./src/features/device/index.ts";
export type { Device } from "./src/features/device/index.ts";

export { ChatClient } from "./src/features/chat/index.ts";
export type { Message, SendTextError, SendTextInput } from "./src/features/chat/index.ts";
export { EmptyMessageError, MessageState, MessageTooLongError } from "./src/features/chat/index.ts";

export { NodesClient } from "./src/features/nodes/index.ts";
export type { Node } from "./src/features/nodes/index.ts";

export { ChannelsClient } from "./src/features/channels/index.ts";
export type { Channel } from "./src/features/channels/index.ts";

export { ConfigClient } from "./src/features/config/index.ts";
export type {
  ModuleConfig,
  ModuleConfigSection,
  RadioConfig,
  RadioConfigSection,
} from "./src/features/config/index.ts";

export { TelemetryClient } from "./src/features/telemetry/index.ts";
export type { TelemetryKind, TelemetryReading } from "./src/features/telemetry/index.ts";

export { PositionClient } from "./src/features/position/index.ts";
export type { Position } from "./src/features/position/index.ts";

export { TraceRouteClient } from "./src/features/traceroute/index.ts";
export type { TraceRoute } from "./src/features/traceroute/index.ts";

export { FilesClient } from "./src/features/files/index.ts";
export type { FileTransfer, TransferStatus } from "./src/features/files/index.ts";

// Phase-A legacy shims (removed in Phase C)
export { MeshDevice } from "./src/shim/legacyMeshDevice.ts";
export * as Utils from "./src/shim/legacyUtils.ts";
