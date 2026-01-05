/**
 * ConnectionService - Singleton service for managing device connections
 *
 * Handles the imperative work: connecting, disconnecting, managing MeshDevice
 * instances, heartbeats, and transport cleanup.
 */

import logger from "@core/services/logger";
import {
  configCacheRepo,
  connectionRepo,
  deviceRepo,
  nodeRepo,
} from "@data/repositories";
import type { ConnectionStatus } from "@data/repositories/ConnectionRepository";
import type { Connection } from "@data/schema";
import { SubscriptionService } from "@data/subscriptionService";
import { MeshDevice, type Protobuf, Types } from "@meshtastic/core";
import { randId } from "@shared/utils/randId";
import { useDeviceStore } from "@state/index.ts";
import { testHttpReachable } from "../utils.ts";
import { BrowserHardware } from "./BrowserHardware.ts";
import { BluetoothStrategy } from "./strategies/BluetoothStrategy";
import { HttpStrategy } from "./strategies/HttpStrategy";
import { SerialStrategy } from "./strategies/SerialStrategy";
import type { ConnectionStrategy, PacketTransport } from "./strategies/types";

const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000;

interface ConnectionState {
  strategy?: ConnectionStrategy;
  nativeHandle?: unknown;
  cleanup?: () => void;
  heartbeat?: ReturnType<typeof setInterval>;
  subscriptions: Array<() => void>;
}

export interface NavigationIntent {
  nodeNum: number;
  cached: boolean;
  timestamp: number;
}

/**
 * Singleton service for managing connection lifecycle
 */
class ConnectionServiceClass {
  private state = new Map<number, ConnectionState>();
  private listeners = new Set<() => void>();
  private navigationCallbacks = new Set<(intent: NavigationIntent) => void>();

  /**
   * Subscribe to navigation intents (connection success events)
   * Used by React components to handle navigation after connection
   */
  onNavigationIntent(
    callback: (intent: NavigationIntent) => void,
  ): () => void {
    this.navigationCallbacks.add(callback);
    return () => {
      this.navigationCallbacks.delete(callback);
    };
  }

  private emitNavigationIntent(nodeNum: number, cached: boolean): void {
    const intent: NavigationIntent = {
      nodeNum,
      cached,
      timestamp: Date.now(),
    };
    for (const cb of this.navigationCallbacks) {
      cb(intent);
    }
  }

  /**
   * Subscribe to connection state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /**
   * Update connection status in database and notify listeners
   */
  async updateStatus(
    id: number,
    status: ConnectionStatus,
    errorMsg?: string,
  ): Promise<void> {
    await connectionRepo.updateStatus(id, status, errorMsg);
    this.notify();
  }

  /**
   * Set up a MeshDevice with the given transport
   *
   * Connection flow:
   * 1. Create MeshDevice and subscribe to events
   * 2. Wait for myNodeInfo to get nodeNum
   * 3. Check for cached config/nodes
   * 4. If cache exists: use cache, mark connected, sync in background
   * 5. If no cache: run full configureTwoStage in foreground
   *
   * @param opts.skipConfig - Debug flag to skip config sync entirely
   */
  private async setupMeshDevice(
    id: number,
    transport: PacketTransport,
    opts?: { skipConfig?: boolean },
  ): Promise<number> {
    const conn = await connectionRepo.getConnection(id);
    const deviceId = conn?.meshDeviceId ?? randId();

    logger.info(
      `[ConnectionService] Setting up MeshDevice deviceId=${deviceId}`,
    );

    const { addDevice, setActiveDeviceId, setActiveConnectionId } =
      useDeviceStore.getState();

    const device = addDevice(deviceId);
    const meshDevice = new MeshDevice(transport, deviceId);

    setActiveDeviceId(deviceId);
    device.addConnection(meshDevice);

    const state = this.getState(id);

    // Track whether we used cache for fast reconnection
    let usedCache = false;

    // Store myNodeNum when received - device.hardware.myNodeNum is stale after setHardware
    let receivedMyNodeNum: number | undefined;

    // Promise to ensure device is upserted before navigation
    let resolveDeviceUpserted: () => void;
    const deviceUpsertedPromise = new Promise<void>((resolve) => {
      resolveDeviceUpserted = resolve;
    });

    // Helper to start heartbeat
    const startHeartbeat = () => {
      meshDevice
        .heartbeat()
        .then(() => {
          const heartbeat = setInterval(() => {
            meshDevice.heartbeat().catch(console.warn);
          }, HEARTBEAT_INTERVAL_MS);
          state.heartbeat = heartbeat;
        })
        .catch(console.warn);
    };

    // Helper to run config sync
    const runConfigSync = () => {
      logger.debug(`[ConnectionService] Starting configureTwoStage`);
      const syncPromise = meshDevice.configureTwoStage();

      syncPromise
        .then(() => {
          logger.debug(`[ConnectionService] configureTwoStage completed`);
          if (!usedCache) {
            startHeartbeat();
          }
        })
        .catch(async (err) => {
          if (usedCache) {
            logger.warn(
              `[ConnectionService] Config sync failed but using cache: ${err.message}`,
            );
          } else {
            logger.error(
              `[ConnectionService] configureTwoStage failed: ${err.message}`,
            );
            await this.updateStatus(id, "error", err.message);
          }
        });
    };

    meshDevice.events.onMyNodeInfo.subscribe(async (nodeInfo) => {
      receivedMyNodeNum = nodeInfo.myNodeNum;
      device.setHardware(nodeInfo);
      logger.debug(
        `[ConnectionService] Received myNodeInfo, myNodeNum: ${nodeInfo.myNodeNum}`,
      );

      // Upsert device in database so routes can validate
      // Only nodeNum is available from myNodeInfo - other fields come from User packets
      try {
        await deviceRepo.upsertDevice({
          nodeNum: nodeInfo.myNodeNum,
        });
        logger.debug(
          `[ConnectionService] Upserted device ${nodeInfo.myNodeNum}`,
        );

        // Link connection to device
        await connectionRepo.updateConnection(id, {
          nodeNum: nodeInfo.myNodeNum,
        });
        logger.debug(
          `[ConnectionService] Linked connection ${id} to device ${nodeInfo.myNodeNum}`,
        );

        // Signal that device is ready for navigation
        resolveDeviceUpserted();
      } catch (err) {
        logger.warn("[ConnectionService] Failed to upsert device:", err);
        // Still resolve so navigation can proceed (will fail at route guard)
        resolveDeviceUpserted();
      }

      // Subscribe to device events now that we have the real myNodeNum
      // This must happen after we know myNodeNum to properly filter own messages
      const dbUnsub = SubscriptionService.subscribeToDevice(
        nodeInfo.myNodeNum,
        nodeInfo.myNodeNum,
        meshDevice,
      );
      state.subscriptions.push(dbUnsub);
      logger.debug(`[DB] Subscribed to device ${nodeInfo.myNodeNum} events`);

      try {
        // Check for cached config
        const cachedConfig = await configCacheRepo.getCachedConfig(
          nodeInfo.myNodeNum,
        );

        // Check if we have cached nodes
        const cachedNodes = await nodeRepo.getNodes(nodeInfo.myNodeNum);
        const hasCache = cachedConfig && cachedNodes.length > 0;

        if (hasCache) {
          logger.info(
            `[ConnectionService] Fast reconnection: using cached config + ${cachedNodes.length} nodes`,
          );
          usedCache = true;

          // Load cached config into device store
          device.setCachedConfig(
            cachedConfig.config as Protobuf.LocalOnly.LocalConfig,
            cachedConfig.moduleConfig as Protobuf.LocalOnly.LocalModuleConfig,
          );
          device.setConnectionPhase("cached");

          // Mark as connected immediately
          await this.updateStatus(id, "connected");
          logger.info(
            `[ConnectionService] Emitting navigation intent (cached), myNodeNum=${nodeInfo.myNodeNum}`,
          );
          this.emitNavigationIntent(nodeInfo.myNodeNum, true);

          // Start heartbeat immediately for cached connection
          startHeartbeat();

          // Config sync continues in background to update cache
          logger.debug(
            `[ConnectionService] Config sync continuing in background`,
          );
        }
      } catch (err) {
        logger.warn("[ConnectionService] Error checking cache:", err);
      }
    });

    // Subscribe to user packets to sync device info (shortName, longName, hwModel)
    meshDevice.events.onUserPacket.subscribe(async (packet) => {
      // Only sync if this is our own node's user info
      if (receivedMyNodeNum && packet.from === receivedMyNodeNum) {
        try {
          await deviceRepo.upsertDevice({
            nodeNum: packet.from,
            shortName: packet.data.shortName ?? undefined,
            longName: packet.data.longName ?? undefined,
            hwModel: packet.data.hwModel ?? undefined,
          });
          logger.debug(
            `[ConnectionService] Synced device info: ${packet.data.longName ?? packet.data.shortName ?? packet.from}`,
          );
        } catch (err) {
          logger.warn("[ConnectionService] Failed to sync device info:", err);
        }
      }
    });

    meshDevice.events.onConfigPacket.subscribe((config) => {
      const variant = config.payloadVariant.case;
      logger.debug(`[ConnectionService] Config packet: ${variant}`);
      device.setConfig(config);
    });

    meshDevice.events.onModuleConfigPacket.subscribe((config) => {
      const variant = config.payloadVariant.case;
      logger.debug(`[ConnectionService] Module config packet: ${variant}`);
      device.setModuleConfig(config);
    });

    const configCompleteUnsub = meshDevice.events.onConfigComplete.subscribe(
      async (configCompleteId) => {
        logger.info(
          `[ConnectionService] Config complete (nonce: ${configCompleteId}), isCachedConfig=${device.isCachedConfig}`,
        );
        if (configCompleteId === 69420) {
          const wasCached = device.isCachedConfig;
          device.setIsCachedConfig(false);
          device.setConnectionPhase("connected");

          if (!wasCached) {
            await this.updateStatus(id, "connected");
          }

          // Save fresh config to cache
          try {
            if (receivedMyNodeNum) {
              await configCacheRepo.saveCachedConfig(
                receivedMyNodeNum,
                device.config as unknown as Record<string, unknown>,
                device.moduleConfig as unknown as Record<string, unknown>,
                {
                  firmwareVersion:
                    device.metadata.get(receivedMyNodeNum)?.firmwareVersion,
                },
              );
              logger.debug(`[ConnectionService] Saved config to cache`);
            }
          } catch (err) {
            logger.warn("[ConnectionService] Failed to cache config:", err);
          }

          if (!wasCached) {
            // Wait for device to be upserted before navigating
            // This prevents race condition where route guard runs before DB write completes
            await deviceUpsertedPromise;

            if (receivedMyNodeNum) {
              logger.info(
                `[ConnectionService] Emitting navigation intent, myNodeNum=${receivedMyNodeNum}`,
              );
              this.emitNavigationIntent(receivedMyNodeNum, false);
            } else {
              logger.warn(
                `[ConnectionService] Cannot emit navigation intent: myNodeNum is undefined`,
              );
            }
          } else {
            logger.debug(
              `[ConnectionService] Skipping navigation (wasCached=${wasCached})`,
            );
          }
        } else if (configCompleteId === 69421) {
          configCompleteUnsub();
          device.setConnectionPhase("configured");
          await this.updateStatus(id, "configured");
          logger.debug("[ConnectionService] NodeDB sync complete");
        }
      },
    );
    state.subscriptions.push(configCompleteUnsub);

    const statusUnsub = meshDevice.events.onDeviceStatus.subscribe(
      async (status) => {
        if (status === Types.DeviceStatusEnum.DeviceDisconnected) {
          logger.debug(`[ConnectionService] Device disconnected (id: ${id})`);
          device.setConnectionPhase("disconnected");
          await connectionRepo.updateStatus(id, "disconnected");
          this.cleanupHeartbeat(id);
          this.notify();
        }
      },
    );
    state.subscriptions.push(statusUnsub);

    setActiveConnectionId(id);
    device.setConnectionId(id);
    device.resetConfigProgress();

    // Set initial phase to configuring - will be updated by myNodeInfo handler
    device.setConnectionPhase("configuring");
    await this.updateStatus(id, "configuring");

    if (opts?.skipConfig) {
      // Debug mode: skip config sync entirely
      logger.info(`[ConnectionService] Skipping config sync (debug mode)`);
      device.setConnectionPhase("connected");
      await this.updateStatus(id, "connected");
      startHeartbeat();
    } else {
      // Start config sync
      // If cache is found in onMyNodeInfo handler, we'll use cached data immediately
      // and let this sync complete in background to update the cache
      runConfigSync();
    }

    await connectionRepo.linkMeshDevice(id, deviceId);
    this.notify();
    return deviceId;
  }

  /**
   * Connect to a device
   */
  async connect(
    conn: Connection,
    opts?: { allowPrompt?: boolean; skipConfig?: boolean },
  ): Promise<boolean> {
    logger.info(
      `[ConnectionService] Starting connection id=${conn.id} type=${conn.type}`,
    );

    if (conn.status === "configured" || conn.status === "connected") {
      logger.debug(
        `[ConnectionService] Already connected, status=${conn.status}`,
      );
      return true;
    }

    await this.updateStatus(conn.id, "connecting");

    try {
      let strategy: ConnectionStrategy;

      switch (conn.type) {
        case "http":
          strategy = new HttpStrategy();
          break;
        case "bluetooth":
          strategy = new BluetoothStrategy();
          break;
        case "serial":
          strategy = new SerialStrategy();
          break;
        default:
          throw new Error(`Unknown connection type: ${conn.type}`);
      }

      const result = await strategy.connect(conn, opts);

      // Store strategy and handle for cleanup
      const state = this.getState(conn.id);
      state.strategy = strategy;
      state.nativeHandle = result.nativeHandle;
      state.cleanup = result.onDisconnect;

      // Handle bluetooth disconnect specifically if handle is provided
      if (conn.type === "bluetooth" && result.nativeHandle) {
        const btDisconnectUnsub = BrowserHardware.onBluetoothDisconnect(
          result.nativeHandle,
          () => this.updateStatus(conn.id, "disconnected"),
        );
        state.subscriptions.push(btDisconnectUnsub);
      }

      await this.setupMeshDevice(conn.id, result.transport, {
        skipConfig: opts?.skipConfig,
      });
      return true;
    } catch (err: unknown) {
      logger.error(
        `[ConnectionService] Connection failed:`,
        err instanceof Error ? err.message : String(err),
      );
      await this.updateStatus(
        conn.id,
        "error",
        err instanceof Error ? err.message : String(err),
      );
      return false;
    }
  }

  /**
   * Disconnect from a device
   */
  async disconnect(conn: Connection): Promise<void> {
    const state = this.state.get(conn.id);
    if (!state) {
      return;
    }

    this.cleanupHeartbeat(conn.id);

    try {
      // Cleanup all subscriptions
      for (const unsub of state.subscriptions) {
        unsub();
      }
      state.subscriptions = [];
      state.cleanup?.();

      if (conn.meshDeviceId) {
        const { getDevice } = useDeviceStore.getState();
        const device = getDevice(conn.meshDeviceId);

        try {
          device?.connection?.disconnect();
        } catch (err) {
          logger.warn("[ConnectionService] Error during disconnect:", err);
        }

        if (device) {
          device.setConnectionId(null);
          device.setConnectionPhase("disconnected");
        }
      }

      if (state.strategy) {
        await state.strategy.disconnect(state.nativeHandle);
      }
    } catch (err) {
      logger.error(
        `[ConnectionService] Error during clean disconnect for ${conn.id}:`,
        err,
      );
    } finally {
      // Always ensure status is updated and state is cleared
      await connectionRepo.updateConnection(conn.id, {
        status: "disconnected",
        error: null,
      });

      this.state.delete(conn.id);
      this.notify();
    }
  }

  /**
   * Remove a connection entirely
   */
  async remove(conn: Connection): Promise<void> {
    await this.disconnect(conn);

    if (conn.meshDeviceId) {
      const { removeDevice } = useDeviceStore.getState();
      try {
        removeDevice(conn.meshDeviceId);
      } catch {}
    }

    await connectionRepo.deleteConnection(conn.id);
    this.notify();
  }

  /**
   * Refresh status of all connections based on hardware availability
   */
  async refreshStatuses(connections: Connection[]): Promise<void> {
    const httpChecks = connections
      .filter(
        (c): c is Connection & { type: "http"; url: string } =>
          c.type === "http" && c.url !== null && !this.isActiveStatus(c.status),
      )
      .map(async (c) => {
        const ok = await testHttpReachable(c.url);
        await connectionRepo.updateStatus(c.id, ok ? "online" : "error");
      });

    const btChecks = connections
      .filter((c) => c.type === "bluetooth" && !this.isActiveStatus(c.status))
      .map(async (c) => {
        if (!BrowserHardware.hasBluetooth()) {
          return;
        }
        const devices = await BrowserHardware.getBluetoothDevices();
        const hasPermission = devices.some((d) => d.id === c.deviceId);
        await connectionRepo.updateStatus(
          c.id,
          hasPermission ? "online" : "disconnected",
        );
      });

    const serialChecks = connections
      .filter((c) => c.type === "serial" && !this.isActiveStatus(c.status))
      .map(async (c) => {
        if (!BrowserHardware.hasSerial()) {
          return;
        }
        const ports = await BrowserHardware.getSerialPorts();
        const hasPermission = ports.some(
          (p) =>
            p.usbVendorId === c.usbVendorId &&
            p.usbProductId === c.usbProductId,
        );
        await connectionRepo.updateStatus(
          c.id,
          hasPermission ? "online" : "disconnected",
        );
      });

    await Promise.all([...httpChecks, ...btChecks, ...serialChecks]);
    this.notify();
  }

  /**
   * Sync connection statuses with active device
   */
  async syncStatuses(
    connections: Connection[],
    activeDeviceId: number | null,
  ): Promise<void> {
    const activeConnection = connections.find(
      (c) => c.meshDeviceId === activeDeviceId,
    );

    for (const conn of connections) {
      const shouldBeConnected = activeConnection?.id === conn.id;
      if (!shouldBeConnected && this.isActiveStatus(conn.status)) {
        await connectionRepo.updateStatus(conn.id, "disconnected");
      }
    }

    this.notify();
  }

  private getState(id: number): ConnectionState {
    let state = this.state.get(id);
    if (!state) {
      state = { subscriptions: [] };
      this.state.set(id, state);
    }
    return state;
  }

  private cleanupHeartbeat(id: number): void {
    const state = this.state.get(id);
    if (state?.heartbeat) {
      clearInterval(state.heartbeat);
      state.heartbeat = undefined;
    }
  }

  private isActiveStatus(status: ConnectionStatus): boolean {
    return ["connected", "configured", "configuring"].includes(status);
  }

  /**
   * Attempt to auto-reconnect to the last connected device
   * For serial connections, uses getPorts() to check if permission still exists
   * Returns true if auto-reconnect was attempted, false if skipped
   */
  async tryAutoReconnect(): Promise<boolean> {
    try {
      const lastConnection = await connectionRepo.getLastConnectedConnection();

      if (!lastConnection) {
        logger.debug(
          "[ConnectionService] No previous connection found for auto-reconnect",
        );
        return false;
      }

      logger.info(
        `[ConnectionService] Attempting auto-reconnect to ${lastConnection.name} (${lastConnection.type})`,
      );

      // Check if hardware is available before attempting connection
      let hardwareAvailable = false;

      switch (lastConnection.type) {
        case "serial":
          if (BrowserHardware.hasSerial()) {
            const port = await BrowserHardware.findSerialPort(
              lastConnection.usbVendorId,
              lastConnection.usbProductId,
            );
            hardwareAvailable = port !== null;
            if (hardwareAvailable) {
              logger.debug(
                "[ConnectionService] Serial port found via getPorts()",
              );
            }
          }
          break;

        case "bluetooth":
          if (
            BrowserHardware.hasBluetoothGetDevices() &&
            lastConnection.deviceId
          ) {
            const device = await BrowserHardware.findBluetoothDevice(
              lastConnection.deviceId,
            );
            hardwareAvailable = device !== null;
            if (hardwareAvailable) {
              logger.debug(
                "[ConnectionService] Bluetooth device found via getDevices()",
              );
            }
          }
          break;

        case "http":
          // HTTP connections don't require hardware permission
          hardwareAvailable = true;
          break;
      }

      if (!hardwareAvailable) {
        logger.debug(
          `[ConnectionService] Hardware not available for auto-reconnect (${lastConnection.type})`,
        );
        return false;
      }

      // Attempt connection without prompting user
      const success = await this.connect(lastConnection, {
        allowPrompt: false,
      });

      if (success) {
        logger.info("[ConnectionService] Auto-reconnect successful");
      } else {
        logger.warn("[ConnectionService] Auto-reconnect failed");
      }

      return success;
    } catch (err) {
      logger.error(
        "[ConnectionService] Auto-reconnect error:",
        err instanceof Error ? err.message : String(err),
      );
      return false;
    }
  }
}

export const ConnectionService = new ConnectionServiceClass();
