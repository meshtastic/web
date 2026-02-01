import logger from "@core/services/logger";
import { computeLeafHashes } from "@core/utils/merkleConfig.ts";
import {
  channelRepo,
  configCacheRepo,
  configHashRepo,
  connectionRepo,
  deviceRepo,
  nodeRepo,
} from "@data/repositories";
import type { ConnectionStatus } from "@data/repositories/ConnectionRepository";
import type { Connection } from "@data/schema";
import { subscribeToDevice } from "@data/subscriptionService";
import { MeshDevice, type Protobuf, Types } from "@meshtastic/core";
import { TransportHTTP } from "@meshtastic/transport-http";
import { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import { randId } from "@shared/utils/randId";
import { useDeviceStore } from "@state/index.ts";
import { testHttpReachable } from "../utils.ts";
import { BrowserHardware, type SerialDeviceInfo } from "./BrowserHardware.ts";

/** Transport type from SDK transports */
type PacketTransport =
  | Awaited<ReturnType<typeof TransportHTTP.create>>
  | Awaited<ReturnType<typeof TransportWebBluetooth.createFromDevice>>
  | Awaited<ReturnType<typeof TransportWebSerial.createFromPort>>;

/** Result of creating a transport connection */
interface TransportResult {
  transport: PacketTransport;
  nativeHandle?: unknown;
  onDisconnect?: () => void;
  updatedPortInfo?: {
    usbVendorId?: number;
    usbProductId?: number;
  };
}

const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000;
const CONFIG_COMPLETE_STAGE1 = 69420;
const CONFIG_COMPLETE_STAGE2 = 69421;

interface ConnectionState {
  connectionType?: Connection["type"];
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

    let nativeHandle: unknown | undefined;

    try {
      const result = await this.createTransport(conn, opts);
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
        const unsub = BrowserHardware.onBluetoothDisconnect(
          result.nativeHandle as BluetoothDevice,
          () => this.updateStatus(conn.id, "disconnected"),
        );
        state.subscriptions.push(unsub);
      }

      await this.setupMeshDevice(conn.id, result.transport, opts?.skipConfig);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[ConnectionService] Connection failed: ${msg}`);

      // Clean up any resources that were allocated before the failure
      if (nativeHandle) {
        try {
          await this.disconnectTransport(conn.type, nativeHandle);
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
    this.cleanupState(conn.id, state);

    // Disconnect the MeshDevice and clear device store
    this.disconnectMeshDevice();

    if (state.connectionType && state.nativeHandle) {
      await this.disconnectTransport(state.connectionType, state.nativeHandle);
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
  ): Promise<void> {
    // Use a simple random ID for the MeshDevice instance (not persisted)
    const meshDeviceId = randId();

    const { initializeDevice, setConnection } = useDeviceStore.getState();
    const device = initializeDevice();

    const meshDevice = new MeshDevice(transport, meshDeviceId);
    setConnection(meshDevice);

    // Build context for helpers
    let resolveDeviceUpserted: () => void;
    const deviceUpserted = new Promise<void>(
      (r) => (resolveDeviceUpserted = r),
    );

    const ctx: SetupContext = {
      connectionId,
      deviceId: meshDeviceId,
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
    await this.updateStatus(connectionId, "configuring");

    if (skipConfig) {
      logger.info("[ConnectionService] Skipping config (debug mode)");
      await this.updateStatus(connectionId, "connected");
      this.startHeartbeat(ctx);
    } else {
      this.runConfigSync(ctx);
    }

    this.notify();
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
    const { meshDevice, connectionId, state } = ctx;

    const unsub = meshDevice.events.onConfigComplete.subscribe(
      async (nonce) => {
        logger.info(`[ConnectionService] Config complete (nonce: ${nonce})`);

        if (nonce === CONFIG_COMPLETE_STAGE1) {
          await this.handleConfigStage1Complete(ctx);
        } else if (nonce === CONFIG_COMPLETE_STAGE2) {
          unsub();
          await this.updateStatus(connectionId, "configured");
          logger.debug("[ConnectionService] NodeDB sync complete");
        }
      },
    );

    state.subscriptions.push(unsub);
  }

  private subscribeToDeviceStatus(ctx: SetupContext): void {
    const { meshDevice, connectionId, state } = ctx;

    const unsub = meshDevice.events.onDeviceStatus.subscribe(async (status) => {
      if (status === Types.DeviceStatusEnum.DeviceDisconnected) {
        logger.debug(
          `[ConnectionService] Device disconnected (id: ${connectionId})`,
        );
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

    if (!wasCached) {
      await this.updateStatus(connectionId, "connected");
    }

    // Save fresh config to cache and compute base hashes
    if (myNodeNum) {
      await Promise.all([
        this.saveConfigToCache(ctx, myNodeNum),
        this.saveBaseHashes(ctx, myNodeNum),
      ]);
    }

    if (!wasCached && myNodeNum) {
      await ctx.deviceUpserted;
      this.emitNavigationIntent(connectionId, myNodeNum, false);
    }
  }

  /**
   * Compute and save base hashes for the current config.
   * These hashes form the baseline for change detection.
   */
  private async saveBaseHashes(
    ctx: SetupContext,
    nodeNum: number,
  ): Promise<void> {
    try {
      // Fetch channels and user data from DB (they were saved during config phase)
      const [dbChannels, myNode] = await Promise.all([
        channelRepo.getChannels(nodeNum),
        nodeRepo.getNode(nodeNum, nodeNum),
      ]);

      // Convert DB channels to array indexed by channel position
      const channels: unknown[] = [];
      for (const ch of dbChannels) {
        channels[ch.channelIndex] = {
          role: ch.role,
          name: ch.name,
          psk: ch.psk,
          uplinkEnabled: ch.uplinkEnabled,
          downlinkEnabled: ch.downlinkEnabled,
          positionPrecision: ch.positionPrecision,
        };
      }

      // Extract user fields that should be tracked for changes
      const user = myNode
        ? {
            shortName: myNode.shortName,
            longName: myNode.longName,
            role: myNode.role,
            isLicensed: myNode.isLicensed,
          }
        : undefined;

      const hashes = computeLeafHashes({
        config: ctx.device.config,
        moduleConfig: ctx.device.moduleConfig,
        channels,
        user,
      });

      await configHashRepo.saveBaseHashes(nodeNum, hashes);
      logger.debug(
        `[ConnectionService] Saved ${hashes.size} base config hashes`,
      );
    } catch (err) {
      logger.warn("[ConnectionService] Failed to save base hashes:", err);
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

  private disconnectMeshDevice(): void {
    const { device, clearDevice } = useDeviceStore.getState();

    try {
      device?.connection?.disconnect();
    } catch (err) {
      logger.warn("[ConnectionService] Disconnect error:", err);
    }

    clearDevice();
  }

  // =============================================================================
  // Transport Creation (inlined from strategy classes)
  // =============================================================================

  private async createTransport(
    conn: Connection,
    opts?: { allowPrompt?: boolean },
  ): Promise<TransportResult> {
    switch (conn.type) {
      case "http":
        return this.createHttpTransport(conn);
      case "bluetooth":
        return this.createBluetoothTransport(conn, opts);
      case "serial":
        return this.createSerialTransport(conn, opts);
      default:
        throw new Error(`Unknown connection type: ${conn.type}`);
    }
  }

  private async createHttpTransport(
    conn: Connection,
  ): Promise<TransportResult> {
    if (!conn.url) {
      throw new Error("HTTP connection missing URL");
    }

    logger.debug(`[ConnectionService] Testing HTTP reachability: ${conn.url}`);
    const ok = await testHttpReachable(conn.url);

    if (!ok) {
      const url = new URL(conn.url);
      throw new Error(
        url.protocol === "https:"
          ? `Cannot reach HTTPS endpoint. Open ${conn.url} in a new tab to accept the certificate.`
          : "HTTP endpoint not reachable",
      );
    }

    const url = new URL(conn.url);
    logger.debug(`[ConnectionService] Creating HTTP transport for ${url.host}`);

    const transport = await TransportHTTP.create(
      url.host,
      url.protocol === "https:",
    );

    logger.info(`[ConnectionService] HTTP transport created successfully`);

    return { transport, nativeHandle: undefined };
  }

  private async createBluetoothTransport(
    conn: Connection,
    opts?: { allowPrompt?: boolean },
  ): Promise<TransportResult> {
    if (!BrowserHardware.hasBluetooth()) {
      throw new Error("Web Bluetooth not supported");
    }

    logger.debug(`[ConnectionService] Looking for Bluetooth device`);

    let bleDevice: BluetoothDevice | undefined;

    // Try to find existing permission
    if (conn.deviceId) {
      bleDevice =
        (await BrowserHardware.findBluetoothDevice(conn.deviceId)) ?? undefined;
      if (bleDevice) {
        logger.debug(`[ConnectionService] Found existing BT device`);
      }
    }

    // Prompt user if allowed and not found
    if (!bleDevice && opts?.allowPrompt) {
      logger.debug(`[ConnectionService] Requesting new BT device from user`);
      bleDevice =
        (await BrowserHardware.requestBluetoothDevice(conn.gattServiceUUID)) ??
        undefined;
    }

    if (!bleDevice) {
      throw new Error("Bluetooth device not available. Re-select the device.");
    }

    logger.debug(`[ConnectionService] Creating Bluetooth transport`);
    const transport = await TransportWebBluetooth.createFromDevice(bleDevice);
    logger.info(`[ConnectionService] Bluetooth transport created successfully`);

    return { transport, nativeHandle: bleDevice };
  }

  private async createSerialTransport(
    conn: Connection,
    opts?: { allowPrompt?: boolean },
  ): Promise<TransportResult> {
    if (!BrowserHardware.hasSerial()) {
      throw new Error("Web Serial not supported");
    }

    logger.debug(`[ConnectionService] Looking for Serial port`);

    let port: SerialPort | undefined;
    let newPortInfo: SerialDeviceInfo | undefined;

    // Try to find existing permission
    port =
      (await BrowserHardware.findSerialPort(
        conn.usbVendorId,
        conn.usbProductId,
      )) ?? undefined;
    if (port) {
      logger.debug(`[ConnectionService] Found existing serial port`);
    }

    // Prompt user if allowed and not found
    if (!port && opts?.allowPrompt) {
      logger.debug(`[ConnectionService] Requesting serial port from user`);
      const result = await BrowserHardware.requestSerialPort();
      port = result?.port;
      newPortInfo = result ?? undefined;
    }

    if (!port) {
      throw new Error("Serial port not available. Re-select the port.");
    }

    // Ensure port is closed before trying to open
    if (BrowserHardware.isSerialPortOpen(port)) {
      logger.debug(`[ConnectionService] Closing already-open serial port`);
      await BrowserHardware.closeSerialPort(port);
    }

    try {
      logger.debug(`[ConnectionService] Creating Serial transport`);
      const transport = await TransportWebSerial.createFromPort(port);
      logger.info(`[ConnectionService] Serial transport created successfully`);

      return {
        transport,
        nativeHandle: port,
        updatedPortInfo: newPortInfo
          ? {
              usbVendorId: newPortInfo.usbVendorId,
              usbProductId: newPortInfo.usbProductId,
            }
          : undefined,
      };
    } catch (serialErr: unknown) {
      const msg =
        serialErr instanceof Error ? serialErr.message : String(serialErr);

      if (
        msg.includes("Failed to open") ||
        msg.includes("already open") ||
        msg.includes("NetworkError")
      ) {
        throw new Error(
          "Port is locked or in use by another application. Close other apps using this device and try again.",
        );
      }
      throw serialErr;
    }
  }

  private async disconnectTransport(
    type: Connection["type"],
    nativeHandle: unknown,
  ): Promise<void> {
    switch (type) {
      case "bluetooth": {
        const device = nativeHandle as BluetoothDevice | undefined;
        if (device) {
          logger.debug(`[ConnectionService] Disconnecting Bluetooth device`);
          try {
            BrowserHardware.disconnectBluetoothDevice(device);
          } catch (err) {
            logger.warn(
              `[ConnectionService] Error disconnecting Bluetooth device:`,
              err,
            );
          }
        }
        break;
      }

      case "serial": {
        const port = nativeHandle as SerialPort | undefined;
        if (port) {
          logger.debug(`[ConnectionService] Closing Serial port`);
          try {
            await BrowserHardware.closeSerialPort(port);
          } catch (err) {
            logger.warn(`[ConnectionService] Error closing Serial port:`, err);
          }
        }
        break;
      }

      case "http":
        // HTTP transport is stateless, no persistent connection to close
        break;
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
