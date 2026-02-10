/**
 * Connection Service
 *
 * High-level API for managing device connections. Orchestrates transport creation,
 * device setup, and connection lifecycle.
 */
import logger from "@core/services/logger";
import { connectionRepo } from "@data/repositories";
import { configCacheRepo } from "@data/repositories";
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
    opts?: { allowPrompt?: boolean; skipConfig?: boolean },
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
        opts?.skipConfig,
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

  async tryAutoReconnect(): Promise<boolean> {
    const lastConnection = await connectionRepo.getLastConnectedConnection();
    if (!lastConnection) {
      logger.debug(
        "[ConnectionService] No previous connection for auto-reconnect",
      );
      return false;
    }

    logger.info(
      `[ConnectionService] Auto-reconnecting to ${lastConnection.name}`,
    );

    const available =
      await hardwareStatus.checkHardwareAvailable(lastConnection);
    if (!available) {
      logger.debug(
        `[ConnectionService] Hardware unavailable for ${lastConnection.type}`,
      );
      return false;
    }

    // Determine if we can use fast recovery (skip config sync)
    const canUseFastRecovery = await this.canUseFastRecovery(lastConnection);

    if (canUseFastRecovery) {
      // Try fast recovery first (skip config sync)
      logger.info(
        "[ConnectionService] Attempting fast recovery (using cached config)",
      );
      toast({
        title: "Reconnecting...",
        description: "Restoring connection using cached configuration",
        duration: 3000,
      });

      const fastRecoverySuccess = await this.connect(lastConnection, {
        allowPrompt: false,
        skipConfig: true,
      });

      if (fastRecoverySuccess) {
        toast({
          title: "Reconnected",
          description: "Connection restored successfully",
          duration: 3000,
        });
        return true;
      }

      // Fast recovery failed, try full recovery
      logger.warn(
        "[ConnectionService] Fast recovery failed, attempting full recovery",
      );
      toast({
        title: "Reconnecting...",
        description: "Performing full device sync",
        duration: 5000,
      });
    }

    // Full recovery (or fallback from fast recovery)
    const success = await this.connect(lastConnection, { allowPrompt: false });

    if (success) {
      toast({
        title: "Reconnected",
        description: "Connection restored with full sync",
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

  /**
   * Check if fast recovery (skip config sync) can be used
   */
  private async canUseFastRecovery(conn: Connection): Promise<boolean> {
    if (!conn.lastConnectedAt) {
      return false;
    }

    const timeSinceLastConnect = Date.now() - conn.lastConnectedAt.getTime();
    const THIRTY_MINUTES = 30 * 60 * 1000;

    if (timeSinceLastConnect >= THIRTY_MINUTES) {
      logger.debug(
        `[ConnectionService] Last connection was ${Math.round(
          timeSinceLastConnect / 60000,
        )} minutes ago, using full recovery`,
      );
      return false;
    }

    if (!conn.nodeNum) {
      return false;
    }

    const cachedConfig = await configCacheRepo.getCachedConfig(conn.nodeNum);
    if (!cachedConfig) {
      logger.debug(
        `[ConnectionService] No cached config available for node ${conn.nodeNum}, using full recovery`,
      );
      return false;
    }

    logger.debug(
      `[ConnectionService] Can use fast recovery: last connected ${Math.round(
        timeSinceLastConnect / 60000,
      )} minutes ago`,
    );
    return true;
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
