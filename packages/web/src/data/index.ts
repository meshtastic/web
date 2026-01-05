export { dbClient, getDb, getSql } from "./client.ts";
export { ChannelError, DBError, MessageError, NodeError } from "./errors.ts";
export type { ConnectionStatus, ConnectionType } from "./hooks/index.ts";
export {
  resetConnectionStatuses,
  useAllMessages,
  useChannel,
  useChannelMessages,
  useChannels,
  useConnect,
  useConnection,
  useConversations,
  useDefaultConnection,
  useDevices,
  useDirectMessages,
  useFavoriteNodes,
  useMessageDraft,
  useNode,
  useNodes,
  usePendingMessages,
  usePositionHistory,
  usePositionTrails,
  useTelemetryHistory,
} from "./hooks/index.ts";
export { MigrationService } from "./migrationService.ts";
// Export packet batcher
export { PacketBatcher, packetBatcher } from "./packetBatcher.ts";
export {
  ChannelRepository,
  ConnectionRepository,
  DeviceRepository,
  MessageRepository,
  NodeRepository,
  PreferencesRepository,
  TracerouteRepository,
  channelRepo,
  connectionRepo,
  deviceRepo,
  messageRepo,
  nodeRepo,
  preferencesRepo,
  tracerouteRepo,
} from "./repositories/index.ts";
// Export schema types
export type {
  Channel,
  Connection,
  Device,
  LastRead,
  Message,
  MessageDraft,
  NewChannel,
  NewConnection,
  NewDevice,
  NewLastRead,
  NewMessage,
  NewMessageDraft,
  NewNode,
  NewPacketLog,
  NewPositionLog,
  NewTelemetryLog,
  NewTracerouteLog,
  Node,
  PacketLog,
  PositionLog,
  TelemetryLog,
  TracerouteLog,
} from "./schema.ts";
// Export schema tables for queries
export {
  channels,
  connections,
  devices,
  lastRead,
  messageDrafts,
  messages,
  nodes,
  packetLogs,
  positionLogs,
  telemetryLogs,
  tracerouteLogs,
} from "./schema.ts";
// Export subscription service
export { SubscriptionService } from "./subscriptionService.ts";
export type { ConversationType } from "./types.ts";

/**
 * Initialize the database
 * Call this once at app startup
 */
export async function initDatabase(): Promise<void> {
  const { dbClient } = await import("./client.ts");
  await dbClient.init();
}

/**
 * Close the database connection
 * Useful for cleanup in tests
 */
export async function closeDatabase(): Promise<void> {
  const { dbClient } = await import("./client.ts");
  await dbClient.close();
}

/**
 * Delete all data from the database
 * WARNING: This is destructive! Use only for testing/reset
 */
export async function deleteAllData(): Promise<void> {
  const { dbClient } = await import("./client.ts");
  await dbClient.deleteAll();
}
