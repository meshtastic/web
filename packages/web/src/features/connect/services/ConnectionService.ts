import logger from "@core/services/logger";
import {
  configCacheRepo,
  connectionRepo,
  deviceRepo,
  nodeRepo,
} from "@data/repositories";
import type { ConnectionStatus } from "@data/repositories/ConnectionRepository";
import type { Connection } from "@data/schema";
import { subscribeToDevice } from "@data/subscriptionService";
import { MeshDevice, type Protobuf, Types } from "@meshtastic/core";
import { randId } from "@shared/utils/randId";
import { useDeviceStore } from "@state/index.ts";
import { testHttpReachable } from "../utils.ts";
import { BrowserHardware } from "./BrowserHardware.ts";
import { BluetoothStrategy } from "./strategies/BluetoothStrategy.ts";
import { HttpStrategy } from "./strategies/HttpStrategy.ts";
import { SerialStrategy } from "./strategies/SerialStrategy.ts";
import type {
  ConnectionStrategy,
  PacketTransport,
} from "./strategies/types.ts";

const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000;
const CONFIG_COMPLETE_STAGE1 = 69420;
const CONFIG_COMPLETE_STAGE2 = 69421;

interface ConnectionState {
  strategy?: ConnectionStrategy;
  nativeHandle?: unknown;
  cleanup?: () => void;
  heartbeat?: ReturnType<typeof setInterval>;
  subscriptions: Array<() => void>;
  cancelled?: boolean;
}

export interface NavigationIntent {
  nodeNum: number;
  cached: boolean;
  timestamp: number;
}

/** Context passed through setup helpers */
interface SetupContext {
  connectionId: number;
  deviceId: number;
  meshDevice: MeshDevice;
  device: ReturnType<ReturnType<typeof useDeviceStore.getState>["addDevice"]>;
  state: ConnectionState;
  myNodeNum?: number;
  usedCache: boolean;
  deviceUpserted: Promise<void>;
  resolveDeviceUpserted: () => void;
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

    try {
      const strategy = this.createStrategy(conn.type);
      const result = await strategy.connect(conn, opts);

      const state = this.getOrCreateState(conn.id);
      state.strategy = strategy;
      state.nativeHandle = result.nativeHandle;
      state.cleanup = result.onDisconnect;

      if (conn.type === "bluetooth" && result.nativeHandle) {
        const unsub = BrowserHardware.onBluetoothDisconnect(
          result.nativeHandle,
          () => this.updateStatus(conn.id, "disconnected"),
        );
        state.subscriptions.push(unsub);
      }

      await this.setupMeshDevice(conn.id, result.transport, opts?.skipConfig);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[ConnectionService] Connection failed: ${msg}`);
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
    this.cleanupState(conn.id, state);

    if (conn.meshDeviceId) {
      this.disconnectMeshDevice(conn.meshDeviceId);
    }

    if (state.strategy) {
      await state.strategy.disconnect(state.nativeHandle);
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

    if (conn.meshDeviceId) {
      try {
        useDeviceStore.getState().removeDevice(conn.meshDeviceId);
      } catch {}
    }

    await connectionRepo.deleteConnection(conn.id);
    this.notify();
  }

  async refreshStatuses(connections: Connection[]): Promise<void> {
    const checks = connections.flatMap((c) => {
      if (this.isActiveStatus(c.status)) {
        return [];
      }
      return this.createStatusCheck(c);
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

    const available = await this.checkHardwareAvailable(lastConnection);
    if (!available) {
      logger.debug(
        `[ConnectionService] Hardware unavailable for ${lastConnection.type}`,
      );
      return false;
    }

    return this.connect(lastConnection, { allowPrompt: false });
  }

  private async setupMeshDevice(
    connectionId: number,
    transport: PacketTransport,
    skipConfig?: boolean,
  ): Promise<number> {
    const conn = await connectionRepo.getConnection(connectionId);
    const deviceId = conn?.meshDeviceId ?? randId();

    const { initializeDevice, setConnection } = useDeviceStore.getState();
    const device = initializeDevice();

    const meshDevice = new MeshDevice(transport, deviceId);
    setConnection(meshDevice);

    // Build context for helpers
    let resolveDeviceUpserted: () => void;
    const deviceUpserted = new Promise<void>(
      (r) => (resolveDeviceUpserted = r),
    );

    const ctx: SetupContext = {
      connectionId,
      deviceId,
      meshDevice,
      device,
      state: this.getOrCreateState(connectionId),
      usedCache: false,
      deviceUpserted,
      resolveDeviceUpserted: resolveDeviceUpserted!,
    };

    this.subscribeToNodeInfo(ctx);
    this.subscribeToUserPackets(ctx);
    this.subscribeToConfig(ctx);
    this.subscribeToConfigComplete(ctx);
    this.subscribeToDeviceStatus(ctx);

    device.resetConfigProgress();
    device.setConnectionPhase("configuring");
    await this.updateStatus(connectionId, "configuring");

    if (skipConfig) {
      logger.info("[ConnectionService] Skipping config (debug mode)");
      device.setConnectionPhase("connected");
      await this.updateStatus(connectionId, "connected");
      this.startHeartbeat(ctx);
    } else {
      this.runConfigSync(ctx);
    }

    await connectionRepo.linkMeshDevice(connectionId, deviceId);
    this.notify();
    return deviceId;
  }

  private subscribeToNodeInfo(ctx: SetupContext): void {
    const { meshDevice, device, state } = ctx;

    meshDevice.events.onMyNodeInfo.subscribe(async (nodeInfo) => {
      ctx.myNodeNum = nodeInfo.myNodeNum;
      device.setHardware(nodeInfo);
      logger.debug(`[ConnectionService] myNodeNum: ${nodeInfo.myNodeNum}`);

      // Upsert device and link connection
      await this.upsertDeviceRecord(ctx, nodeInfo.myNodeNum);
      ctx.resolveDeviceUpserted();

      // Subscribe to DB events now that we have nodeNum
      const dbUnsub = subscribeToDevice(
        nodeInfo.myNodeNum,
        nodeInfo.myNodeNum,
        meshDevice,
      );
      state.subscriptions.push(dbUnsub);

      // Check cache for fast reconnection
      await this.tryUseCachedConfig(ctx, nodeInfo.myNodeNum);
    });
  }

  private subscribeToUserPackets(ctx: SetupContext): void {
    ctx.meshDevice.events.onUserPacket.subscribe(async (packet) => {
      if (ctx.myNodeNum && packet.from === ctx.myNodeNum) {
        await deviceRepo
          .upsertDevice({
            nodeNum: packet.from,
            shortName: packet.data.shortName ?? undefined,
            longName: packet.data.longName ?? undefined,
            hwModel: packet.data.hwModel ?? undefined,
          })
          .catch((err) =>
            logger.warn("[ConnectionService] Failed to sync device info:", err),
          );
      }
    });
  }

  private subscribeToConfig(ctx: SetupContext): void {
    const { meshDevice, device } = ctx;

    meshDevice.events.onConfigPacket.subscribe((config) => {
      logger.debug(`[ConnectionService] Config: ${config.payloadVariant.case}`);
      device.setConfig(config);
    });

    meshDevice.events.onModuleConfigPacket.subscribe((config) => {
      logger.debug(
        `[ConnectionService] ModuleConfig: ${config.payloadVariant.case}`,
      );
      device.setModuleConfig(config);
    });
  }

  private subscribeToConfigComplete(ctx: SetupContext): void {
    const { meshDevice, device, connectionId, state } = ctx;

    const unsub = meshDevice.events.onConfigComplete.subscribe(
      async (nonce) => {
        logger.info(`[ConnectionService] Config complete (nonce: ${nonce})`);

        if (nonce === CONFIG_COMPLETE_STAGE1) {
          await this.handleConfigStage1Complete(ctx);
        } else if (nonce === CONFIG_COMPLETE_STAGE2) {
          unsub();
          device.setConnectionPhase("configured");
          await this.updateStatus(connectionId, "configured");
          logger.debug("[ConnectionService] NodeDB sync complete");
        }
      },
    );

    state.subscriptions.push(unsub);
  }

  private subscribeToDeviceStatus(ctx: SetupContext): void {
    const { meshDevice, device, connectionId, state } = ctx;

    const unsub = meshDevice.events.onDeviceStatus.subscribe(async (status) => {
      if (status === Types.DeviceStatusEnum.DeviceDisconnected) {
        logger.debug(
          `[ConnectionService] Device disconnected (id: ${connectionId})`,
        );
        device.setConnectionPhase("disconnected");
        await connectionRepo.updateStatus(connectionId, "disconnected");
        this.clearHeartbeat(connectionId);
        this.notify();
      }
    });

    state.subscriptions.push(unsub);
  }

  private async upsertDeviceRecord(
    ctx: SetupContext,
    nodeNum: number,
  ): Promise<void> {
    try {
      await deviceRepo.upsertDevice({ nodeNum });
      await connectionRepo.updateConnection(ctx.connectionId, { nodeNum });
      logger.debug(
        `[ConnectionService] Linked connection ${ctx.connectionId} to device ${nodeNum}`,
      );
    } catch (err) {
      logger.warn("[ConnectionService] Failed to upsert device:", err);
    }
  }

  private async tryUseCachedConfig(
    ctx: SetupContext,
    nodeNum: number,
  ): Promise<void> {
    try {
      const [cachedConfig, cachedNodes] = await Promise.all([
        configCacheRepo.getCachedConfig(nodeNum),
        nodeRepo.getNodes(nodeNum),
      ]);

      if (!cachedConfig || cachedNodes.length === 0) {
        return;
      }

      logger.info(
        `[ConnectionService] Using cache: ${cachedNodes.length} nodes`,
      );
      ctx.usedCache = true;

      ctx.device.setCachedConfig(
        cachedConfig.config as Protobuf.LocalOnly.LocalConfig,
        cachedConfig.moduleConfig as Protobuf.LocalOnly.LocalModuleConfig,
      );
      ctx.device.setConnectionPhase("cached");

      await this.updateStatus(ctx.connectionId, "connected");
      this.emitNavigationIntent(ctx.connectionId, nodeNum, true);
      this.startHeartbeat(ctx);
    } catch (err) {
      logger.warn("[ConnectionService] Cache check failed:", err);
    }
  }

  private async handleConfigStage1Complete(ctx: SetupContext): Promise<void> {
    const { device, connectionId, myNodeNum } = ctx;
    const wasCached = device.isCachedConfig;

    device.setIsCachedConfig(false);
    device.setConnectionPhase("connected");

    if (!wasCached) {
      await this.updateStatus(connectionId, "connected");
    }

    // Save fresh config to cache
    if (myNodeNum) {
      await this.saveConfigToCache(ctx, myNodeNum);
    }

    if (!wasCached && myNodeNum) {
      await ctx.deviceUpserted;
      this.emitNavigationIntent(connectionId, myNodeNum, false);
    }
  }

  private async saveConfigToCache(
    ctx: SetupContext,
    nodeNum: number,
  ): Promise<void> {
    try {
      await configCacheRepo.saveCachedConfig(
        nodeNum,
        ctx.device.config as unknown as Record<string, unknown>,
        ctx.device.moduleConfig as unknown as Record<string, unknown>,
        { firmwareVersion: ctx.device.metadata.get(nodeNum)?.firmwareVersion },
      );
      logger.debug("[ConnectionService] Saved config to cache");
    } catch (err) {
      logger.warn("[ConnectionService] Failed to cache config:", err);
    }
  }

  private runConfigSync(ctx: SetupContext): void {
    logger.debug("[ConnectionService] Starting configureTwoStage");

    ctx.meshDevice
      .configureTwoStage()
      .then(() => {
        logger.debug("[ConnectionService] configureTwoStage completed");
        if (!ctx.usedCache) {
          this.startHeartbeat(ctx);
        }
      })
      .catch(async (err) => {
        if (ctx.usedCache) {
          logger.warn(
            `[ConnectionService] Config sync failed (using cache): ${err.message}`,
          );
        } else {
          logger.error(
            `[ConnectionService] configureTwoStage failed: ${err.message}`,
          );
          await this.updateStatus(ctx.connectionId, "error", err.message);
        }
      });
  }

  private startHeartbeat(ctx: SetupContext): void {
    ctx.meshDevice
      .heartbeat()
      .then(() => {
        ctx.state.heartbeat = setInterval(() => {
          ctx.meshDevice.heartbeat().catch(console.warn);
        }, HEARTBEAT_INTERVAL_MS);
      })
      .catch(console.warn);
  }

  private clearHeartbeat(id: number): void {
    const state = this.state.get(id);
    if (state?.heartbeat) {
      clearInterval(state.heartbeat);
      state.heartbeat = undefined;
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private emitNavigationIntent(
    connectionId: number,
    nodeNum: number,
    cached: boolean,
  ): void {
    if (this.state.get(connectionId)?.cancelled) {
      logger.debug(`[ConnectionService] Skipping nav intent - cancelled`);
      return;
    }

    const intent: NavigationIntent = { nodeNum, cached, timestamp: Date.now() };
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
    for (const unsub of state.subscriptions) {
      unsub();
    }
    state.subscriptions = [];
    state.cleanup?.();
  }

  private disconnectMeshDevice(meshDeviceId: number): void {
    const { getDevice } = useDeviceStore.getState();
    const device = getDevice(meshDeviceId);

    try {
      device?.connection?.disconnect();
    } catch (err) {
      logger.warn("[ConnectionService] Disconnect error:", err);
    }

    if (device) {
      device.setConnectionId(null);
      device.setConnectionPhase("disconnected");
    }
  }

  private createStrategy(type: Connection["type"]): ConnectionStrategy {
    switch (type) {
      case "http":
        return new HttpStrategy();
      case "bluetooth":
        return new BluetoothStrategy();
      case "serial":
        return new SerialStrategy();
      default:
        throw new Error(`Unknown connection type: ${type}`);
    }
  }

  private isActiveStatus(status: ConnectionStatus): boolean {
    return ["connected", "configured", "configuring"].includes(status);
  }

  private createStatusCheck(conn: Connection): Promise<void>[] {
    switch (conn.type) {
      case "http":
        if (!conn.url) {
          return [];
        }
        return [this.checkHttpStatus(conn.id, conn.url)];

      case "bluetooth":
        return [this.checkBluetoothStatus(conn.id, conn.deviceId)];

      case "serial":
        return [
          this.checkSerialStatus(conn.id, conn.usbVendorId, conn.usbProductId),
        ];

      default:
        return [];
    }
  }

  private async checkHttpStatus(id: number, url: string): Promise<void> {
    const ok = await testHttpReachable(url);
    await connectionRepo.updateStatus(id, ok ? "online" : "error");
  }

  private async checkBluetoothStatus(
    id: number,
    deviceId: string | null,
  ): Promise<void> {
    if (!BrowserHardware.hasBluetooth()) {
      return;
    }
    const devices = await BrowserHardware.getBluetoothDevices();
    const found = devices.some((d) => d.id === deviceId);
    await connectionRepo.updateStatus(id, found ? "online" : "disconnected");
  }

  private async checkSerialStatus(
    id: number,
    vendorId: number | null,
    productId: number | null,
  ): Promise<void> {
    if (!BrowserHardware.hasSerial()) {
      return;
    }
    const ports = await BrowserHardware.getSerialPorts();
    const found = ports.some(
      (p) => p.usbVendorId === vendorId && p.usbProductId === productId,
    );
    await connectionRepo.updateStatus(id, found ? "online" : "disconnected");
  }

  private async checkHardwareAvailable(conn: Connection): Promise<boolean> {
    switch (conn.type) {
      case "serial": {
        if (!BrowserHardware.hasSerial()) {
          return false;
        }
        const port = await BrowserHardware.findSerialPort(
          conn.usbVendorId,
          conn.usbProductId,
        );
        return port !== null;
      }

      case "bluetooth": {
        if (!BrowserHardware.hasBluetoothGetDevices() || !conn.deviceId) {
          return false;
        }
        const device = await BrowserHardware.findBluetoothDevice(conn.deviceId);
        return device !== null;
      }

      case "http":
        return true;

      default:
        return false;
    }
  }
}

export const ConnectionService = new ConnectionServiceClass();
