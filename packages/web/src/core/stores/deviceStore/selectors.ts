import type { Device } from "./index.ts";
import { useDeviceStore } from "./index.ts";
import type { Connection, ConnectionId } from "./types.ts";

/**
 * Hook to get the currently active connection
 */
export function useActiveConnection(): Connection | undefined {
  return useDeviceStore((s) => s.getActiveConnection());
}

/**
 * Hook to get the HTTP connection marked as default
 */
export function useDefaultConnection(): Connection | undefined {
  return useDeviceStore((s) => s.savedConnections.find((c) => c.isDefault));
}

/**
 * Hook to get the first saved connection
 */
export function useFirstSavedConnection(): Connection | undefined {
  return useDeviceStore((s) => s.savedConnections.at(0));
}

export function useAddSavedConnection() {
  return useDeviceStore((s) => s.addSavedConnection);
}

export function useUpdateSavedConnection() {
  return useDeviceStore((s) => s.updateSavedConnection);
}

export function useRemoveSavedConnection() {
  return useDeviceStore((s) => s.removeSavedConnection);
}

/**
 * Hook to get the active connection ID
 */
export function useActiveConnectionId(): ConnectionId | null {
  return useDeviceStore((s) => s.activeConnectionId);
}

export function useSetActiveConnectionId() {
  return useDeviceStore((s) => s.setActiveConnectionId);
}

/**
 * Hook to get a specific connection's status
 */
export function useConnectionStatus(id: ConnectionId): string | undefined {
  return useDeviceStore(
    (s) => s.savedConnections.find((c) => c.id === id)?.status,
  );
}

/**
 * Hook to get a device for a specific connection
 */
export function useDeviceForConnection(id: ConnectionId): Device | undefined {
  return useDeviceStore((s) => s.getDeviceForConnection(id));
}

/**
 * Hook to get a connection for a specific device
 */
export function useConnectionForDevice(
  deviceId: number,
): Connection | undefined {
  return useDeviceStore((s) => s.getConnectionForDevice(deviceId));
}

/**
 * Hook to check if any connection is currently connecting
 */
export function useIsConnecting(): boolean {
  return useDeviceStore((s) =>
    s.savedConnections.some(
      (c) => c.status === "connecting" || c.status === "configuring",
    ),
  );
}

/**
 * Hook to get error message for a specific connection
 */
export function useConnectionError(id: ConnectionId): string | null {
  return useDeviceStore(
    (s) => s.savedConnections.find((c) => c.id === id)?.error ?? null,
  );
}

/**
 * Hook to get all saved connections
 */
export function useSavedConnections(): Connection[] {
  return useDeviceStore((s) => s.savedConnections);
}

/**
 * Hook to check if a connection is connected
 */
export function useIsConnected(id: ConnectionId): boolean {
  return useDeviceStore((s) => {
    const status = s.savedConnections.find((c) => c.id === id)?.status;
    return status === "connected" || status === "configured";
  });
}
