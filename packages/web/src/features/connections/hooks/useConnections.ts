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
import { useDeviceStore } from "@state/index.ts";
import { type Result, ResultAsync } from "neverthrow";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { NewConnectionInput } from "../components/AddConnectionDialog/AddConnectionDialog.tsx";
import { BrowserHardware } from "../services/BrowserHardware.ts";
import { ConnectionService } from "../services/ConnectionService.ts";

export type { ConnectionStatus, ConnectionType };

/**
 * Hook to manage connections
 */
export function useConnections() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);

  const getSnapshot = useCallback(() => connectionCache.get(), []);

  const connections = useSyncExternalStore(
    useCallback((onStoreChange) => {
      const unsubCache = connectionCache.subscribe(onStoreChange);

      const unsubService = ConnectionService.subscribe(onStoreChange);

      const unsubSerial = BrowserHardware.onSerialDeviceChange(onStoreChange);

      return () => {
        unsubCache();
        unsubService();
        unsubSerial();
      };
    }, []),
    getSnapshot,
    getSnapshot,
  );

  const refresh = useCallback(async (): Promise<
    Result<Connection[], ConnectionError>
  > => {
    const result = await ResultAsync.fromPromise(
      connectionRepo.getConnections(),
      (cause: unknown) => ConnectionError.getConnections(cause),
    );
    if (result.isOk()) {
      connectionCache.set(result.value);
    }
    return result;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    BrowserHardware.onAnyBluetoothDisconnect(() => {
      refresh();
    }).then((unsub) => {
      cleanup = unsub;
    });

    return () => {
      cleanup?.();
    };
  }, [refresh]);

  const connect = useCallback(
    async (id: number, opts?: { allowPrompt?: boolean }) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) {
        return false;
      }

      const result = await ConnectionService.connect(conn, opts);
      await refresh();
      return result;
    },
    [connections, refresh],
  );

  const disconnect = useCallback(
    async (id: number) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) {
        return;
      }

      await ConnectionService.disconnect(conn);
      await refresh();
    },
    [connections, refresh],
  );

  const removeConnection = useCallback(
    async (id: number) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) {
        return;
      }

      await ConnectionService.remove(conn);
      await refresh();
    },
    [connections, refresh],
  );

  const addConnection = useCallback(
    async (input: NewConnectionInput) => {
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
      await refresh();
      return conn;
    },
    [refresh],
  );

  const setDefaultConnection = useCallback(
    async (id: number) => {
      const conn = connections.find((c) => c.id === id);
      if (conn) {
        await connectionRepo.setDefault(id, !conn.isDefault);
        await refresh();
      }
    },
    [connections, refresh],
  );

  const refreshStatuses = useCallback(async () => {
    await ConnectionService.refreshStatuses(connections);
    await refresh();
  }, [connections, refresh]);

  const syncConnectionStatuses = useCallback(async () => {
    await ConnectionService.syncStatuses(connections, activeDeviceId);
    await refresh();
  }, [connections, activeDeviceId, refresh]);

  return {
    connections,
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
 * Cache for connection data to support useSyncExternalStore
 */
class ConnectionCache {
  private data: Connection[] = [];
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  get(): Connection[] {
    return this.data;
  }

  set(connections: Connection[]): void {
    this.data = connections;
    this.notify();
  }
}

const connectionCache = new ConnectionCache();

/**
 * Hook to fetch a single connection
 */
export function useConnection(id: number) {
  const { connections } = useConnections();
  const connection = connections.find((c) => c.id === id);

  const refresh = useCallback(async (): Promise<
    Result<Connection | undefined, ConnectionError>
  > => {
    const result = await ResultAsync.fromPromise(
      connectionRepo.getConnection(id),
      (cause: unknown) => ConnectionError.getConnection(id, cause),
    );
    return result;
  }, [id]);

  return { connection, refresh };
}

/**
 * Hook to fetch the default connection
 */
export function useDefaultConnection() {
  const { connections } = useConnections();
  const connection = connections.find((c) => c.isDefault);

  const refresh = useCallback(async (): Promise<
    Result<Connection | undefined, ConnectionError>
  > => {
    const result = await ResultAsync.fromPromise(
      connectionRepo.getDefaultConnection(),
      (cause: unknown) => ConnectionError.getDefaultConnection(cause),
    );
    return result;
  }, []);

  return { connection, refresh };
}

/**
 * Reset all connection statuses on app startup
 */
export async function resetConnectionStatuses(): Promise<void> {
  await connectionRepo.resetAllStatuses();
}
