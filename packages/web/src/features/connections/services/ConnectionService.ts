/**
 * ConnectionService - Singleton service for managing device connections
 *
 * Handles the imperative work: connecting, disconnecting, managing MeshDevice
 * instances, heartbeats, and transport cleanup. Keeps mutable state out of React.
 */

import { router } from "@app/app/routes";
import logger from "@core/services/logger";
import {
  configCacheRepo,
  connectionRepo,
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
  nativeHandle?: any;
  cleanup?: () => void;
  heartbeat?: ReturnType<typeof setInterval>;
  dbSubscription?: () => void;
  statusSubscription?: () => void;
  disconnectSubscription?: () => void;
}

/**
 * Singleton service for managing connection lifecycle
 */
class ConnectionServiceClass {
  private state = new Map<number, ConnectionState>();
  private listeners = new Set<() => void>();

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
      device.setHardware(nodeInfo);
      logger.debug(
        `[ConnectionService] Received myNodeInfo, myNodeNum: ${nodeInfo.myNodeNum}`,
      );

      // Subscribe to device events now that we have the real myNodeNum
      // This must happen after we know myNodeNum to properly filter own messages
      if (!state.dbSubscription) {
        state.dbSubscription = SubscriptionService.subscribeToDevice(
          deviceId,
          nodeInfo.myNodeNum,
          meshDevice,
        );
        logger.debug(`[DB] Subscribed to device ${deviceId} events`);
      }

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
          router.navigate({ to: "/messages", search: { channel: 0 } });

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
        logger.debug(
          `[ConnectionService] Config complete (nonce: ${configCompleteId})`,
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
            const myNodeNum = device.hardware.myNodeNum;
            if (myNodeNum) {
              await configCacheRepo.saveCachedConfig(
                myNodeNum,
                device.config as unknown as Record<string, unknown>,
                device.moduleConfig as unknown as Record<string, unknown>,
                {
                  firmwareVersion:
                    device.metadata.get(myNodeNum)?.firmwareVersion,
                },
              );
              logger.debug(`[ConnectionService] Saved config to cache`);
            }
          } catch (err) {
            logger.warn("[ConnectionService] Failed to cache config:", err);
          }

          if (!wasCached) {
            router.navigate({ to: "/messages", search: { channel: 0 } });
          }
        } else if (configCompleteId === 69421) {
          configCompleteUnsub();
          device.setConnectionPhase("configured");
          await this.updateStatus(id, "configured");
          logger.debug("[ConnectionService] NodeDB sync complete");
        }
      },
    );

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
    state.statusSubscription = statusUnsub;

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
         state.disconnectSubscription = BrowserHardware.onBluetoothDisconnect(
            result.nativeHandle,
            () => this.updateStatus(conn.id, "disconnected"),
          );
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
      state.dbSubscription?.();
      state.statusSubscription?.();
      state.disconnectSubscription?.();
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
      logger.error(`[ConnectionService] Error during clean disconnect for ${conn.id}:`, err);
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
      state = {};
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
}

export const ConnectionService = new ConnectionServiceClass();

