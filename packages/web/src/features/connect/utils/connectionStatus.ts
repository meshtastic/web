/**
 * Consolidated connection status constants and utilities
 *
 * This module provides a single source of truth for connection statuses,
 * their display properties, and translation keys.
 */

/**
 * All possible connection statuses
 */
export const ConnectionStatus = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONFIGURING: "configuring",
  CONFIGURED: "configured",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  ERROR: "error",
} as const;

export type ConnectionStatusType =
  (typeof ConnectionStatus)[keyof typeof ConnectionStatus];

/**
 * Status indicator colors (Tailwind classes)
 */
export const STATUS_COLORS: Record<ConnectionStatusType, string> = {
  [ConnectionStatus.DISCONNECTED]: "bg-gray-400",
  [ConnectionStatus.CONNECTING]: "bg-yellow-500",
  [ConnectionStatus.CONFIGURING]: "bg-yellow-500",
  [ConnectionStatus.CONFIGURED]: "bg-chart-2",
  [ConnectionStatus.CONNECTED]: "bg-chart-2",
  [ConnectionStatus.RECONNECTING]: "bg-yellow-500 animate-pulse",
  [ConnectionStatus.ERROR]: "bg-red-500",
};

/**
 * Translation keys for each status (in connections.json)
 */
export const STATUS_TRANSLATION_KEYS: Record<ConnectionStatusType, string> = {
  [ConnectionStatus.DISCONNECTED]: "status.disconnected",
  [ConnectionStatus.CONNECTING]: "status.connecting",
  [ConnectionStatus.CONFIGURING]: "status.configuring",
  [ConnectionStatus.CONFIGURED]: "status.configured",
  [ConnectionStatus.CONNECTED]: "status.connected",
  [ConnectionStatus.RECONNECTING]: "status.reconnecting",
  [ConnectionStatus.ERROR]: "status.error",
};

/**
 * Check if a status represents an active/busy state
 */
export function isConnecting(status: ConnectionStatusType): boolean {
  return (
    status === ConnectionStatus.CONNECTING ||
    status === ConnectionStatus.CONFIGURING ||
    status === ConnectionStatus.RECONNECTING
  );
}

/**
 * Check if a status represents a connected state
 */
export function isConnected(status: ConnectionStatusType): boolean {
  return (
    status === ConnectionStatus.CONNECTED ||
    status === ConnectionStatus.CONFIGURED
  );
}

/**
 * Get the status color class for a given status
 */
export function getStatusColor(status: ConnectionStatusType): string {
  return STATUS_COLORS[status] ?? STATUS_COLORS[ConnectionStatus.DISCONNECTED];
}

/**
 * Get the translation key for a given status
 */
export function getStatusTranslationKey(status: ConnectionStatusType): string {
  return (
    STATUS_TRANSLATION_KEYS[status] ??
    STATUS_TRANSLATION_KEYS[ConnectionStatus.DISCONNECTED]
  );
}

/**
 * Determine effective status from connection state and auto-reconnect status
 */
export function getEffectiveStatus(
  connectionStatus: string | undefined,
  autoReconnectStatus?: "idle" | "connecting" | "connected" | "failed",
): ConnectionStatusType {
  // Auto-reconnect "connecting" takes precedence (show reconnecting state)
  if (autoReconnectStatus === "connecting") {
    return ConnectionStatus.RECONNECTING;
  }

  // Map the connection status
  switch (connectionStatus) {
    case "connected":
    case "configured":
      return ConnectionStatus.CONNECTED;
    case "connecting":
      return ConnectionStatus.CONNECTING;
    case "configuring":
      return ConnectionStatus.CONFIGURING;
    case "error":
      return ConnectionStatus.ERROR;
    case "disconnected":
    default:
      return ConnectionStatus.DISCONNECTED;
  }
}
