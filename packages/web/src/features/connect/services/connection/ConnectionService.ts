/**
 * Connection Service
 *
 * High-level API for managing device connections. Orchestrates transport creation,
 * device setup, and connection lifecycle.
 */
import logger from "@core/services/logger";
import { connectionRepo } from "@data/repositories";
import type { ConnectionStatus } from "@data/repositories/ConnectionRepository";
import type { Connection } from "@data/schema";
import { toast } from "@shared/hooks/useToast";
import * as browserBluetooth from "../browserBluetooth";
import * as deviceSetup from "./deviceSetup";
import type { NavigationIntent, SetupContext } from "./deviceSetup";
import * as hardwareStatus from "./hardwareStatus";
import * as transportFactory from "./transportFactory";

export type { NavigationIntent };

interface ConnectionState {
  connectionType?: Connection["type"];
  nativeHandle?: unknown;
  cleanup?: () => void;
  heartbeat?: ReturnType<typeof setInterval>;
  subscriptions: Array<() => void>;
  cancelled?: boolean;
  setupContext?: SetupContext;
}

class ConnectionServiceClass {
  private state = new Map<number, ConnectionState>();
  private listeners = new Set<() => void>();
  private navigationCallbacks = new Set<(intent: NavigationIntent) => void>();

  onNavigationIntent(callback: (intent: NavigationIntent) => void): () => void {
    this.navigationCallbacks.add(callback);
    return () => this.navigationCallbacks.delete(callback);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async updateStatus(
    id: number,
    status: ConnectionStatus,
    errorMsg?: string,
  ): Promise<void> {
    await connectionRepo.updateStatus(id, status, errorMsg);
    this.notify();
  }

  async connect(
    conn: Connection,
    opts?: { allowPrompt?: boolean },
  ): Promise<boolean> {
    logger.info(
      `[ConnectionService] Connecting id=${conn.id} type=${conn.type}`,
    );

    if (conn.status === "configured" || conn.status === "connected") {
      return true;
    }

    await this.updateStatus(conn.id, "connecting");

    let nativeHandle: unknown | undefined;

    try {
      const result = await transportFactory.createTransport(conn, opts);
      nativeHandle = result.nativeHandle;

      const state = this.getOrCreateState(conn.id);
      state.connectionType = conn.type;
      state.nativeHandle = nativeHandle;
      state.cleanup = result.onDisconnect;

      // Update connection record if user selected a different serial port
      if (result.updatedPortInfo) {
        await connectionRepo.updateConnection(conn.id, {
          usbVendorId: result.updatedPortInfo.usbVendorId ?? null,
          usbProductId: result.updatedPortInfo.usbProductId ?? null,
        });
        logger.debug(
          `[ConnectionService] Updated serial port info: vendor=${result.updatedPortInfo.usbVendorId}, product=${result.updatedPortInfo.usbProductId}`,
        );
      }

      if (conn.type === "bluetooth" && result.nativeHandle) {
        const unsub = browserBluetooth.onBluetoothDisconnect(
          result.nativeHandle as BluetoothDevice,
          () => this.updateStatus(conn.id, "disconnected"),
        );
        state.subscriptions.push(unsub);
      }

      const setupCtx = await deviceSetup.setupMeshDevice(
        conn.id,
        result.transport,
        {
          onStatusChange: (status, errorMsg) =>
            this.updateStatus(conn.id, status, errorMsg),
          onNavigationIntent: (intent) =>
            this.emitNavigationIntent(conn.id, intent),
          onHeartbeatStarted: (heartbeat) => {
            state.heartbeat = heartbeat;
          },
        },
      );

      state.setupContext = setupCtx;
      state.subscriptions.push(...setupCtx.subscriptions);

      this.notify();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[ConnectionService] Connection failed: ${msg}`);

      // Clean up any resources that were allocated before the failure
      if (nativeHandle) {
        try {
          await transportFactory.disconnectTransport(conn.type, nativeHandle);
        } catch (cleanupErr) {
          logger.warn(
            `[ConnectionService] Cleanup after failure also failed:`,
            cleanupErr,
          );
        }
      }

      // Clean up any state that was created
      const state = this.state.get(conn.id);
      if (state) {
        this.cleanupState(conn.id, state);
        this.state.delete(conn.id);
      }

      await this.updateStatus(conn.id, "error", msg);
      return false;
    }
  }

  async disconnect(conn: Connection): Promise<void> {
    const state = this.state.get(conn.id);
    if (!state) {
      return;
    }

    state.cancelled = true;
    if (state.setupContext) {
      state.setupContext.cancelled = true;
    }
    this.cleanupState(conn.id, state);

    // Disconnect the MeshDevice and clear device store
    deviceSetup.disconnectMeshDevice();

    if (state.connectionType && state.nativeHandle) {
      await transportFactory.disconnectTransport(
        state.connectionType,
        state.nativeHandle,
      );
    }

    await connectionRepo.updateConnection(conn.id, {
      status: "disconnected",
      error: null,
    });
    this.state.delete(conn.id);
    this.notify();
  }

  async remove(conn: Connection): Promise<void> {
    await this.disconnect(conn);
    await connectionRepo.deleteConnection(conn.id);
    this.notify();
  }

  async refreshStatuses(connections: Connection[]): Promise<void> {
    const checks = connections.flatMap((c) => {
      if (this.isActiveStatus(c.status)) {
        return [];
      }
      return hardwareStatus.createStatusCheck(c);
    });

    await Promise.all(checks);
    this.notify();
  }

  /**
   * Attempt auto-reconnect. Only HTTP connections with autoReconnect enabled
   * are eligible — BLE and Serial require an explicit browser permission grant.
   */
  async tryAutoReconnect(): Promise<boolean> {
    const lastConnection = await connectionRepo.getLastConnectedConnection();
    if (!lastConnection) {
      logger.debug(
        "[ConnectionService] No previous connection for auto-reconnect",
      );
      return false;
    }

    if (lastConnection.type !== "http" || !lastConnection.autoReconnect) {
      logger.debug(
        `[ConnectionService] Auto-reconnect not enabled for ${lastConnection.type} connection`,
      );
      return false;
    }

    logger.info(
      `[ConnectionService] Auto-reconnecting to ${lastConnection.name}`,
    );

    toast({
      title: "Reconnecting...",
      description: `Connecting to ${lastConnection.name}`,
      duration: 3000,
    });

    const success = await this.connect(lastConnection, { allowPrompt: false });

    if (success) {
      toast({
        title: "Reconnected",
        description: "Connection restored successfully",
        duration: 3000,
      });
    } else {
      toast({
        title: "Connection Failed",
        description: "Unable to reconnect to device",
        variant: "destructive",
        duration: 5000,
      });
    }

    return success;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private emitNavigationIntent(
    connectionId: number,
    intent: NavigationIntent,
  ): void {
    if (this.state.get(connectionId)?.cancelled) {
      logger.debug(`[ConnectionService] Skipping nav intent - cancelled`);
      return;
    }

    for (const cb of this.navigationCallbacks) {
      cb(intent);
    }
  }

  private getOrCreateState(id: number): ConnectionState {
    let state = this.state.get(id);
    if (!state) {
      state = { subscriptions: [] };
      this.state.set(id, state);
    }
    return state;
  }

  private cleanupState(id: number, state: ConnectionState): void {
    this.clearHeartbeat(id);
    if (state.setupContext) {
      deviceSetup.cleanupSubscriptions(state.setupContext);
    }
    for (const unsub of state.subscriptions) {
      unsub();
    }
    state.subscriptions = [];
    state.cleanup?.();
  }

  private clearHeartbeat(id: number): void {
    const state = this.state.get(id);
    if (state?.heartbeat) {
      clearInterval(state.heartbeat);
      state.heartbeat = undefined;
    }
  }

  private isActiveStatus(status: ConnectionStatus): boolean {
    return ["connected", "configured", "configuring"].includes(status);
  }
}

export const ConnectionService = new ConnectionServiceClass();
