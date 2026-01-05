/**
 * useConnect - Connection state synchronization
 */

import { connectionRepo } from "@data/repositories";
import type {
  ConnectionStatus,
  ConnectionType,
} from "@data/repositories/ConnectionRepository";
import { useDeviceStore } from "@state/index.ts";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import { useReactiveQuery } from "sqlocal/react";
import type { NewConnectionInput } from "../components/AddConnectionDialog/AddConnectionDialog.tsx";
import { BrowserHardware } from "../services/BrowserHardware.ts";
import {
  ConnectionService,
  type NavigationIntent,
} from "../services/ConnectionService.ts";

export type { ConnectionStatus, ConnectionType };
export type { NavigationIntent };

export type AutoReconnectStatus = "idle" | "connecting" | "connected" | "failed";

export interface UseConnectOptions {
  /** Attempt auto-reconnect to last connection on mount */
  autoReconnect?: boolean;
  /** Callback for navigation intents after successful connection */
  onNavigationIntent?: (intent: NavigationIntent) => void;
}

/**
 * Hook to manage connections
 *
 * @param options.autoReconnect - Attempt auto-reconnect to last connection on mount
 * @param options.onNavigationIntent - Callback for navigation intents after successful connection
 */
export function useConnect(options?: UseConnectOptions) {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);

  const query = useMemo(() => connectionRepo.buildConnectionsQuery(), []);
  const { data } = useReactiveQuery(connectionRepo.getClient(), query);

  const connList = data ?? [];

  // Auto-reconnect state
  const [autoReconnectStatus, setAutoReconnectStatus] =
    useState<AutoReconnectStatus>("idle");

  // Handle auto-reconnect on mount
  useEffect(() => {
    if (!options?.autoReconnect) return;

    setAutoReconnectStatus("connecting");
    ConnectionService.tryAutoReconnect()
      .then((success) =>
        setAutoReconnectStatus(success ? "connected" : "failed"),
      )
      .catch(() => setAutoReconnectStatus("failed"));
  }, [options?.autoReconnect]);

  // Subscribe to navigation intents
  useEffect(() => {
    if (!options?.onNavigationIntent) return;
    return ConnectionService.onNavigationIntent(options.onNavigationIntent);
  }, [options?.onNavigationIntent]);

  const refreshStatuses = useCallback(async () => {
    if (connList.length > 0) {
      await ConnectionService.refreshStatuses(connList);
    }
  }, [connList]);

  // Sync statuses on mount and when connection list changes
  useEffect(() => {
    refreshStatuses();
  }, [refreshStatuses]);

  // Listen for hardware changes to re-check statuses
  const onHardwareChange = useEffectEvent(() => {
    refreshStatuses();
  });

  useEffect(() => {
    const unsubSerial = BrowserHardware.onSerialDeviceChange(onHardwareChange);

    let unsubBt: (() => void) | undefined;
    BrowserHardware.onAnyBluetoothDisconnect(onHardwareChange).then((unsub) => {
      unsubBt = unsub;
    });

    return () => {
      unsubSerial();
      unsubBt?.();
    };
  }, []);

  const connect = useCallback(
    async (
      id: number,
      opts?: { allowPrompt?: boolean; skipConfig?: boolean },
    ) => {
      const conn = connList.find((c) => c.id === id);
      if (!conn) {
        return false;
      }

      const result = await ConnectionService.connect(conn, opts);
      return result;
    },
    [connList],
  );

  const disconnect = useCallback(
    async (id: number) => {
      const conn = connList.find((c) => c.id === id);
      if (!conn) {
        return;
      }

      await ConnectionService.disconnect(conn);
    },
    [connList],
  );

  const removeConnection = useCallback(
    async (id: number) => {
      const conn = connList.find((c) => c.id === id);
      if (!conn) {
        return;
      }

      await ConnectionService.remove(conn);
    },
    [connList],
  );

  const addConnection = useCallback(async (input: NewConnectionInput) => {
    const conn = await connectionRepo.createConnection({
      type: input.type,
      name:
        input.name.length === 0 && input.type === "http"
          ? input.url
          : input.name,
      status: "disconnected",
      url: input.type === "http" ? input.url : null,
      deviceId: input.type === "bluetooth" ? input.deviceId : null,
      deviceName: input.type === "bluetooth" ? input.deviceName : null,
      gattServiceUUID:
        input.type === "bluetooth" ? input.gattServiceUUID : null,
      usbVendorId: input.type === "serial" ? input.usbVendorId : null,
      usbProductId: input.type === "serial" ? input.usbProductId : null,
    });
    return conn;
  }, []);

  const setDefaultConnection = useCallback(
    async (id: number) => {
      const conn = connList.find((c) => c.id === id);
      if (conn) {
        await connectionRepo.setDefault(id, !conn.isDefault);
      }
    },
    [connList],
  );

  const syncConnectionStatuses = useCallback(async () => {
    await ConnectionService.syncStatuses(connList, activeDeviceId);
  }, [connList, activeDeviceId]);

  return {
    connections: connList,
    addConnection,
    connect,
    disconnect,
    removeConnection,
    setDefaultConnection,
    refreshStatuses,
    syncConnectionStatuses,
    autoReconnectStatus,
  };
}

/**
 * Hook to fetch a single connection
 */
export function useConnection(id: number) {
  const query = useMemo(
    () => connectionRepo.buildConnectionQuery(id),
    [id],
  );
  const { data } = useReactiveQuery(connectionRepo.getClient(), query);

  return { connection: data?.[0] };
}

/**
 * Hook to fetch the default connection
 */
export function useDefaultConnection() {
  const query = useMemo(
    () => connectionRepo.buildDefaultConnectionQuery(),
    [],
  );
  const { data } = useReactiveQuery(connectionRepo.getClient(), query);

  return { connection: data?.[0] };
}

/**
 * Reset all connection statuses on app startup
 */
export async function resetConnectionStatuses(): Promise<void> {
  await connectionRepo.resetAllStatuses();
}
