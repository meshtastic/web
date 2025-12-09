/**
 * Database module exports
 *
 * This module provides a complete database layer using sqlocal + Drizzle ORM
 * for storing messages, nodes, channels, and historical logs.
 */

// Export database client
export { dbClient, getDb, getSql } from "./client";

// Export migration service
export { MigrationService } from "./migrationService";

// Export repositories
export {
  MessageRepository,
  NodeRepository,
  ChannelRepository,
  ConnectionRepository,
  messageRepo,
  nodeRepo,
  channelRepo,
  connectionRepo,
} from "./repositories";

// Export subscription service
export { SubscriptionService } from "./subscriptionService";

// Export errors
export { DBError, ChannelError, NodeError, MessageError } from "./errors";

// Export hooks
export {
  useChannels,
  useChannel,
  usePrimaryChannel,
  useNodes,
  useNode,
  useFavoriteNodes,
  useRecentNodes,
  usePositionHistory,
  useTelemetryHistory,
  usePositionTrails,
  useDirectMessages,
  useBroadcastMessages,
  useAllMessages,
  usePendingMessages,
  useConversations,
  useMessageDraft,
  useConnections,
  useConnection,
  useDefaultConnection,
  resetConnectionStatuses,
} from "./hooks";
export type { ConnectionStatus, ConnectionType } from "./hooks";

// Export schema types
export type {
  Message,
  NewMessage,
  Node,
  NewNode,
  Channel,
  NewChannel,
  PositionLog,
  NewPositionLog,
  PacketLog,
  NewPacketLog,
  TelemetryLog,
  NewTelemetryLog,
  MessageDraft,
  NewMessageDraft,
  LastRead,
  NewLastRead,
  Connection,
  NewConnection,
} from "./schema";

// Export schema tables for queries
export {
  messages,
  nodes,
  channels,
  connections,
  positionLogs,
  packetLogs,
  telemetryLogs,
  messageDrafts,
  lastRead,
} from "./schema";

/**
 * Initialize the database
 * Call this once at app startup
 */
export async function initDatabase(): Promise<void> {
  const { dbClient } = await import("./client");
  await dbClient.init();
}

/**
 * Close the database connection
 * Useful for cleanup in tests
 */
export async function closeDatabase(): Promise<void> {
  const { dbClient } = await import("./client");
  await dbClient.close();
}

/**
 * Delete all data from the database
 * WARNING: This is destructive! Use only for testing/reset
 */
export async function deleteAllData(): Promise<void> {
  const { dbClient } = await import("./client");
  await dbClient.deleteAll();
}
