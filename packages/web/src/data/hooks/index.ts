// Channel hooks
export {
  useChannel,
  useChannels,
  usePrimaryChannel,
} from "./useChannels.ts";
// Connection hooks - re-exported from features/connections for backwards compatibility
export type {
  ConnectionStatus,
  ConnectionType,
} from "@features/connections/hooks/useConnections";
export {
  resetConnectionStatuses,
  useConnection,
  useConnections,
  useDefaultConnection,
} from "@features/connections/hooks/useConnections";
// Device-specific preferences hooks
export {
  invalidateDevicePreferenceCache,
  useDevicePreference,
} from "./useDevicePreference.ts";
// Message hooks - re-exported from features/messages for backwards compatibility
export { useMessageDraft } from "@features/messages/hooks/useMessageDraft";
export {
  useAllMessages,
  useChannelMessages,
  useConversations,
  useDirectMessages,
  usePendingMessages,
} from "@features/messages/hooks/useMessages";
// Node hooks - re-exported from features/nodes for backwards compatibility
export {
  useFavoriteNodes,
  useNode,
  useNodes,
  usePositionHistory,
  usePositionTrails,
  useRecentNodes,
  useTelemetryHistory,
} from "@features/nodes/hooks/useNodes";
// Packet log hooks
export { invalidatePacketLogsCache, usePacketLogs } from "./usePacketLogs.ts";
// Preferences hooks
export {
  invalidatePreferenceCache,
  PREFERENCE_KEYS,
  useAllPreferences,
  usePanelSizes,
  usePreference,
} from "./usePreferences.ts";
export type { PreferenceKey } from "./usePreferences.ts";
// Unread count hooks - re-exported from features/messages for backwards compatibility
export {
  markConversationAsRead,
  useUnreadCountBroadcast,
  useUnreadCountDirect,
} from "@features/messages/hooks/useUnreadCount";
