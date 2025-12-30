/**
 * useConnections - Connection state synchronization
 *
 */

import { ConnectionError } from "@data/errors";
import { connectionRepo } from "@data/repositories";
import type {
  ConnectionStatus,
  ConnectionType,
} from "@data/repositories/ConnectionRepository";
import type { Connection } from "@data/schema";
import { connections } from "@data/schema";
import { useDeviceStore } from "@state/index.ts";
import { eq } from "drizzle-orm";
import { type Result, okAsync } from "neverthrow";
import { useCallback, useEffect, useMemo } from "react";
import { useReactiveQuery } from "sqlocal/react";
import { getClient, getDb } from "../../../data/client.ts";
import type { NewConnectionInput } from "../components/AddConnectionDialog/AddConnectionDialog.tsx";
import { BrowserHardware } from "../services/BrowserHardware.ts";
import { ConnectionService } from "../services/ConnectionService.ts";

export type { ConnectionStatus, ConnectionType };

/**
 * Hook to manage connections
 */
export function useConnections() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);

  const query = useMemo(() => getDb().select().from(connections), []);
  const { data } = useReactiveQuery(getClient(), query);

  const connList = data ?? [];

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
  useEffect(() => {
    const unsubSerial = BrowserHardware.onSerialDeviceChange(() => {
      refreshStatuses();
    });

    let unsubBt: (() => void) | undefined;
    BrowserHardware.onAnyBluetoothDisconnect(() => {
      refreshStatuses();
    }).then((unsub) => {
      unsubBt = unsub;
    });

    return () => {
      unsubSerial();
      unsubBt?.();
    };
  }, [refreshStatuses]);

  const refresh = useCallback(async (): Promise<
    Result<Connection[], ConnectionError>
  > => {
    // No-op for reactive query, but we can trigger status check
    await refreshStatuses();
    return okAsync(connList);
  }, [connList, refreshStatuses]);

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
    refresh,
    addConnection,
    connect,
    disconnect,
    removeConnection,
    setDefaultConnection,
    refreshStatuses,
    syncConnectionStatuses,
  };
}

/**
 * Hook to fetch a single connection
 */
export function useConnection(id: number) {
  const query = useMemo(
    () => getDb().select().from(connections).where(eq(connections.id, id)),
    [id],
  );
  const { data } = useReactiveQuery(getClient(), query);
  const connection = data?.[0];

  const refresh = useCallback(async (): Promise<
    Result<Connection | undefined, ConnectionError>
  > => {
    return okAsync(connection);
  }, [connection]);

  return { connection, refresh };
}

/**
 * Hook to fetch the default connection
 */
export function useDefaultConnection() {
  const query = useMemo(
    () => getDb().select().from(connections).where(eq(connections.isDefault, true)),
    [],
  );
  const { data } = useReactiveQuery(getClient(), query);
  const connection = data?.[0];

  const refresh = useCallback(async (): Promise<
    Result<Connection | undefined, ConnectionError>
  > => {
    return okAsync(connection);
  }, [connection]);

  return { connection, refresh };
}

/**
 * Reset all connection statuses on app startup
 */
export async function resetConnectionStatuses(): Promise<void> {
  await connectionRepo.resetAllStatuses();
}