/**
 * Database module exports
 *
 * This module provides a complete database layer using sqlocal + Drizzle ORM
 * for storing messages, nodes, channels, and packet logs.
 */

export { dbClient, getDb, getSql } from "./client.ts";
export { ChannelError, DBError, MessageError, NodeError } from "./errors.ts";
export type { ConnectionStatus, ConnectionType } from "./hooks/index.ts";
export {
  resetConnectionStatuses,
  useAllMessages,
  useBroadcastMessages,
  useChannel,
  useChannels,
  useConnection,
  useConnections,
  useConversations,
  useDefaultConnection,
  useDirectMessages,
  useFavoriteNodes,
  useMessageDraft,
  useNode,
  useNodes,
  usePendingMessages,
  usePositionHistory,
  usePositionTrails,
  usePrimaryChannel,
  useRecentNodes,
  useTelemetryHistory,
} from "./hooks/index.ts";
export { MigrationService } from "./migrationService.ts";
export {
  ChannelRepository,
  ConnectionRepository,
  channelRepo,
  connectionRepo,
  MessageRepository,
  messageRepo,
  NodeRepository,
  nodeRepo,
} from "./repositories/index.ts";
// Export schema types
export type {
  Channel,
  Connection,
  LastRead,
  Message,
  MessageDraft,
  NewChannel,
  NewConnection,
  NewLastRead,
  NewMessage,
  NewMessageDraft,
  NewNode,
  NewPacketLog,
  NewPositionLog,
  NewTelemetryLog,
  Node,
  PacketLog,
  PositionLog,
  TelemetryLog,
} from "./schema.ts";
// Export schema tables for queries
export {
  channels,
  connections,
  lastRead,
  messageDrafts,
  messages,
  nodes,
  packetLogs,
  positionLogs,
  telemetryLogs,
} from "./schema.ts";
// Export subscription service
export { SubscriptionService } from "./subscriptionService.ts";

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
