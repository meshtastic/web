/**
 * ConnectionService - Singleton service for managing device connections
 *
 * Handles the imperative work: connecting, disconnecting, managing MeshDevice
 * instances, heartbeats, and transport cleanup. Keeps mutable state out of React.
 */

import { router } from "@app/app/routes";
import logger from "@core/services/logger";
import { configCacheRepo, connectionRepo } from "@data/repositories";
import type { ConnectionStatus } from "@data/repositories/ConnectionRepository";
import type { Connection } from "@data/schema";
import { SubscriptionService } from "@data/subscriptionService";
import { MeshDevice, type Protobuf, Types } from "@meshtastic/core";
import { TransportHTTP } from "@meshtastic/transport-http";
import { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import { randId } from "@shared/utils/randId";
import { type ConfigConflict, useDeviceStore } from "@state/index.ts";
import { testHttpReachable } from "../utils.ts";
import { BrowserHardware } from "./BrowserHardware.ts";

const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000;

type Transport = BluetoothDevice | SerialPort;

interface ConnectionState {
  transport?: Transport;
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
   */
  private async setupMeshDevice(
    id: number,
    transport:
      | Awaited<ReturnType<typeof TransportHTTP.create>>
      | Awaited<ReturnType<typeof TransportWebBluetooth.createFromDevice>>
      | Awaited<ReturnType<typeof TransportWebSerial.createFromPort>>,
    btDevice?: BluetoothDevice,
    serialPort?: SerialPort,
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
    if (btDevice) {
      state.transport = btDevice;
    }
    if (serialPort) {
      state.transport = serialPort;
    }

    state.dbSubscription = SubscriptionService.subscribeToDevice(
      deviceId,
      0,
      meshDevice,
    );
    logger.debug(`[DB] Subscribed to device ${deviceId} events`);

    meshDevice.events.onMyNodeInfo.subscribe(async (nodeInfo) => {
      device.setHardware(nodeInfo);
      logger.debug(
        `[ConnectionService] Received myNodeInfo, myNodeNum: ${nodeInfo.myNodeNum}`,
      );

      try {
        const cached = await configCacheRepo.getCachedConfig(
          nodeInfo.myNodeNum,
        );
        if (cached) {
          logger.debug(
            `[ConnectionService] Loading cached config for device ${deviceId}`,
          );
          device.setCachedConfig(
            cached.config as Protobuf.LocalOnly.LocalConfig,
            cached.moduleConfig as Protobuf.LocalOnly.LocalModuleConfig,
          );
          device.setConnectionPhase("cached");

          await this.updateStatus(id, "connected");
          router.navigate({ to: "/messages", search: { channel: 0 } });
          logger.debug(
            `[ConnectionService] Fast reconnection: navigated with cached config`,
          );
        }
      } catch (err) {
        logger.warn("[ConnectionService] Failed to load cached config:", err);
      }
    });

    meshDevice.events.onConfigPacket.subscribe(async (config) => {
      const variant = config.payloadVariant.case;
      logger.info(`[ConnectionService] 📦 Config packet received: ${variant}`);

      const myNodeNum = device.hardware.myNodeNum;
      if (variant && myNodeNum && device.hasConfigChange(variant)) {
        try {
          const localChanges = await configCacheRepo.getLocalChangesForVariant(
            myNodeNum,
            "config",
            variant,
          );

          for (const change of localChanges) {
            const remoteValue = config.payloadVariant.value;
            if (
              change.originalValue !== undefined &&
              JSON.stringify(remoteValue) !==
                JSON.stringify(change.originalValue)
            ) {
              const conflict: ConfigConflict = {
                variant,
                localValue: change.value,
                remoteValue,
                originalValue: change.originalValue,
              };
              device.setConfigConflict("config", variant, conflict);
              logger.warn(
                `[ConnectionService] Config conflict detected for ${variant}`,
              );
              return;
            }
          }
        } catch (err) {
          logger.warn(
            "[ConnectionService] Error checking config conflicts:",
            err,
          );
        }
      }

      device.setConfig(config);
    });

    meshDevice.events.onModuleConfigPacket.subscribe(async (config) => {
      const variant = config.payloadVariant.case;
      logger.info(
        `[ConnectionService] 📦 Module config packet received: ${variant}`,
      );

      const myNodeNum = device.hardware.myNodeNum;
      if (variant && myNodeNum && device.hasModuleConfigChange(variant)) {
        try {
          const localChanges = await configCacheRepo.getLocalChangesForVariant(
            myNodeNum,
            "moduleConfig",
            variant,
          );

          for (const change of localChanges) {
            const remoteValue = config.payloadVariant.value;
            if (
              change.originalValue !== undefined &&
              JSON.stringify(remoteValue) !==
                JSON.stringify(change.originalValue)
            ) {
              const conflict: ConfigConflict = {
                variant,
                localValue: change.value,
                remoteValue,
                originalValue: change.originalValue,
              };
              device.setConfigConflict("moduleConfig", variant, conflict);
              logger.warn(
                `[ConnectionService] Module config conflict detected for ${variant}`,
              );
              return;
            }
          }
        } catch (err) {
          logger.warn(
            "[ConnectionService] Error checking module config conflicts:",
            err,
          );
        }
      }

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
          await this.updateStatus(id, "connected");

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
              logger.debug(
                `[ConnectionService] Saved config to cache for device ${deviceId}`,
              );
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
    device.setConnectionPhase("configuring");
    device.resetConfigProgress();
    await this.updateStatus(id, "configuring");

    logger.info(`[ConnectionService] Starting configureTwoStage`);
    meshDevice
      .configureTwoStage()
      .then(() => {
        logger.info(`[ConnectionService] configureTwoStage completed`);
        meshDevice
          .heartbeat()
          .then(() => {
            const heartbeat = setInterval(() => {
              meshDevice.heartbeat().catch(console.warn);
            }, HEARTBEAT_INTERVAL_MS);
            state.heartbeat = heartbeat;
          })
          .catch(console.warn);
      })
      .catch(async (err) => {
        logger.error(
          `[ConnectionService] configureTwoStage failed:`,
          err.message,
        );
        await this.updateStatus(id, "error", err.message);
      });

    await connectionRepo.linkMeshDevice(id, deviceId);
    this.notify();
    return deviceId;
  }

  /**
   * Connect to a device
   */
  async connect(
    conn: Connection,
    opts?: { allowPrompt?: boolean },
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
      if (conn.type === "http") {
        return await this.connectHttp(conn);
      }
      if (conn.type === "bluetooth") {
        return await this.connectBluetooth(conn, opts);
      }
      if (conn.type === "serial") {
        return await this.connectSerial(conn, opts);
      }
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

    return false;
  }

  private async connectHttp(conn: Connection): Promise<boolean> {
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
    await this.setupMeshDevice(conn.id, transport);
    return true;
  }

  private async connectBluetooth(
    conn: Connection,
    opts?: { allowPrompt?: boolean },
  ): Promise<boolean> {
    if (!BrowserHardware.hasBluetooth()) {
      throw new Error("Web Bluetooth not supported");
    }

    logger.debug(`[ConnectionService] Looking for Bluetooth device`);
    const state = this.getState(conn.id);
    let bleDevice = state.transport as BluetoothDevice | undefined;

    if (!bleDevice && conn.deviceId) {
      bleDevice =
        (await BrowserHardware.findBluetoothDevice(conn.deviceId)) ?? undefined;
      if (bleDevice) {
        logger.debug(`[ConnectionService] Found existing BT device`);
      }
    }

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
    await this.setupMeshDevice(conn.id, transport, bleDevice);

    state.disconnectSubscription = BrowserHardware.onBluetoothDisconnect(
      bleDevice,
      () => this.updateStatus(conn.id, "disconnected"),
    );

    return true;
  }

  private async connectSerial(
    conn: Connection,
    opts?: { allowPrompt?: boolean },
  ): Promise<boolean> {
    if (!BrowserHardware.hasSerial()) {
      throw new Error("Web Serial not supported");
    }

    logger.debug(`[ConnectionService] Looking for Serial port`);
    const state = this.getState(conn.id);
    let port = state.transport as SerialPort | undefined;

    if (!port) {
      port =
        (await BrowserHardware.findSerialPort(
          conn.usbVendorId,
          conn.usbProductId,
        )) ?? undefined;
      if (port) {
        logger.debug(`[ConnectionService] Found existing serial port`);
      }
    }

    if (!port && opts?.allowPrompt) {
      logger.debug(`[ConnectionService] Requesting serial port from user`);
      const result = await BrowserHardware.requestSerialPort();
      port = result?.port;
    }

    if (!port) {
      throw new Error("Serial port not available. Re-select the port.");
    }

    if (BrowserHardware.isSerialPortOpen(port)) {
      logger.debug(`[ConnectionService] Closing already-open serial port`);
      await BrowserHardware.closeSerialPort(port);
    }

    try {
      logger.debug(`[ConnectionService] Creating Serial transport`);
      const transport = await TransportWebSerial.createFromPort(port);
      logger.info(`[ConnectionService] Serial transport created successfully`);
      await this.setupMeshDevice(conn.id, transport, undefined, port);
      return true;
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

  /**
   * Disconnect from a device
   */
  async disconnect(conn: Connection): Promise<void> {
    const state = this.state.get(conn.id);
    if (!state) return;

    this.cleanupHeartbeat(conn.id);

    state.dbSubscription?.();
    state.statusSubscription?.();
    state.disconnectSubscription?.();

    if (conn.meshDeviceId) {
      const { getDevice } = useDeviceStore.getState();
      const device = getDevice(conn.meshDeviceId);

      try {
        device?.connection?.disconnect();
      } catch {}

      if (state.transport) {
        if (conn.type === "bluetooth") {
          BrowserHardware.disconnectBluetoothDevice(
            state.transport as BluetoothDevice,
          );
        }
        if (conn.type === "serial") {
          await BrowserHardware.closeSerialPort(state.transport as SerialPort);
        }
      }

      if (device) {
        device.setConnectionId(null);
        device.setConnectionPhase("disconnected");
      }
    }

    await connectionRepo.updateConnection(conn.id, {
      status: "disconnected",
      error: null,
    });

    this.state.delete(conn.id);
    this.notify();
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
        if (!BrowserHardware.hasBluetooth()) return;
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
        if (!BrowserHardware.hasSerial()) return;
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
