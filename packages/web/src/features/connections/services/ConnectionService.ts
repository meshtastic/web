/**
 * ConnectionService - Singleton service for managing device connections
 *
 * Handles the imperative work: connecting, disconnecting, managing MeshDevice
 * instances, heartbeats, and transport cleanup. Keeps mutable state out of React.
 */

import { router } from "@app/app/routes";
import logger from "@core/services/logger";
import { connectionRepo } from "@data/repositories";
import type { ConnectionStatus } from "@data/repositories/ConnectionRepository";
import type { Connection } from "@data/schema";
import { SubscriptionService } from "@data/subscriptionService";
import { MeshDevice, Types } from "@meshtastic/core";
import { TransportHTTP } from "@meshtastic/transport-http";
import { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import { randId } from "@shared/utils/randId";
import { useDeviceStore } from "@state/index.ts";
import { BrowserHardware } from "./BrowserHardware";
import { testHttpReachable } from "../utils";

const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

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

  // ==================== Event System ====================

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

  // ==================== Status Updates ====================

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

  // ==================== MeshDevice Setup ====================

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

    const { addDevice, setActiveDeviceId, setActiveConnectionId } =
      useDeviceStore.getState();

    const device = addDevice(deviceId);
    const meshDevice = new MeshDevice(transport, deviceId);

    setActiveDeviceId(deviceId);
    device.addConnection(meshDevice);

    // Store transport for cleanup
    const state = this.getState(id);
    if (btDevice) state.transport = btDevice;
    if (serialPort) state.transport = serialPort;

    // Subscribe to node info events
    meshDevice.events.onMyNodeInfo.subscribe((nodeInfo) => {
      device.setHardware(nodeInfo);
      logger.debug(
        `[ConnectionService] Received myNodeInfo, myNodeNum: ${nodeInfo.myNodeNum}`,
      );

      // Set up database subscriptions
      const unsubscribe = SubscriptionService.subscribeToDevice(
        deviceId,
        nodeInfo.myNodeNum,
        meshDevice,
      );
      state.dbSubscription = unsubscribe;
      logger.debug(`[DB] Subscribed to device ${deviceId} events`);
    });

    // Subscribe to config events
    meshDevice.events.onConfigPacket.subscribe((config) => {
      logger.debug(
        `[ConnectionService] Config packet: ${config.payloadVariant.case}`,
      );
      device.setConfig(config);
    });

    meshDevice.events.onModuleConfigPacket.subscribe((config) => {
      logger.debug(
        `[ConnectionService] Module config packet: ${config.payloadVariant.case}`,
      );
      device.setModuleConfig(config);
    });

    // Navigate when config stage completes
    const configCompleteUnsub = meshDevice.events.onConfigComplete.subscribe(
      async (configCompleteId) => {
        logger.debug(
          `[ConnectionService] Config complete (nonce: ${configCompleteId})`,
        );
        if (configCompleteId === 69420) {
          // Stage 1: device config loaded
          device.setConnectionPhase("connected");
          await this.updateStatus(id, "connected");
          router.navigate({ to: "/messages", search: { channel: 0 } });
        } else if (configCompleteId === 69421) {
          // Stage 2: nodeDB synced
          configCompleteUnsub();
          device.setConnectionPhase("configured");
          await this.updateStatus(id, "configured");
          logger.debug("[ConnectionService] NodeDB sync complete");
        }
      },
    );

    // Monitor device status for disconnections
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

    // Start two-stage configuration
    meshDevice
      .configureTwoStage()
      .then(() => {
        // Start heartbeat after full configuration
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
        await this.updateStatus(id, "error", err.message);
      });

    await connectionRepo.linkMeshDevice(id, deviceId);
    this.notify();
    return deviceId;
  }

  // ==================== Connection Methods ====================

  /**
   * Connect to a device
   */
  async connect(
    conn: Connection,
    opts?: { allowPrompt?: boolean },
  ): Promise<boolean> {
    if (conn.status === "configured" || conn.status === "connected") {
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
    const transport = await TransportHTTP.create(
      url.host,
      url.protocol === "https:",
    );
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

    const state = this.getState(conn.id);
    let bleDevice = state.transport as BluetoothDevice | undefined;

    // Try to find existing device
    if (!bleDevice && conn.deviceId) {
      bleDevice =
        (await BrowserHardware.findBluetoothDevice(conn.deviceId)) ?? undefined;
    }

    // Request new device if allowed
    if (!bleDevice && opts?.allowPrompt) {
      bleDevice =
        (await BrowserHardware.requestBluetoothDevice(conn.gattServiceUUID)) ??
        undefined;
    }

    if (!bleDevice) {
      throw new Error("Bluetooth device not available. Re-select the device.");
    }

    const transport = await TransportWebBluetooth.createFromDevice(bleDevice);
    await this.setupMeshDevice(conn.id, transport, bleDevice);

    // Listen for disconnection
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

    const state = this.getState(conn.id);
    let port = state.transport as SerialPort | undefined;

    // Try to find existing port
    if (!port) {
      port =
        (await BrowserHardware.findSerialPort(
          conn.usbVendorId,
          conn.usbProductId,
        )) ?? undefined;
    }

    // Request new port if allowed
    if (!port && opts?.allowPrompt) {
      const result = await BrowserHardware.requestSerialPort();
      port = result?.port;
    }

    if (!port) {
      throw new Error("Serial port not available. Re-select the port.");
    }

    // Close if already open
    if (BrowserHardware.isSerialPortOpen(port)) {
      await BrowserHardware.closeSerialPort(port);
    }

    try {
      const transport = await TransportWebSerial.createFromPort(port);
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

    // Cleanup heartbeat
    this.cleanupHeartbeat(conn.id);

    // Cleanup subscriptions
    state.dbSubscription?.();
    state.statusSubscription?.();
    state.disconnectSubscription?.();

    // Disconnect MeshDevice
    if (conn.meshDeviceId) {
      const { getDevice } = useDeviceStore.getState();
      const device = getDevice(conn.meshDeviceId);

      try {
        device?.connection?.disconnect();
      } catch {
        // Ignore
      }

      // Cleanup transport
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

    // Clear state
    this.state.delete(conn.id);
    this.notify();
  }

  /**
   * Remove a connection entirely
   */
  async remove(conn: Connection): Promise<void> {
    // Disconnect first
    await this.disconnect(conn);

    // Remove device from store
    if (conn.meshDeviceId) {
      const { removeDevice } = useDeviceStore.getState();
      try {
        removeDevice(conn.meshDeviceId);
      } catch {
        // Ignore
      }
    }

    // Delete from database
    await connectionRepo.deleteConnection(conn.id);
    this.notify();
  }

  // ==================== Status Refresh ====================

  /**
   * Refresh status of all connections based on hardware availability
   */
  async refreshStatuses(connections: Connection[]): Promise<void> {
    const httpChecks = connections
      .filter(
        (c): c is Connection & { type: "http"; url: string } =>
          c.type === "http" &&
          c.url !== null &&
          !this.isActiveStatus(c.status),
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
  async syncStatuses(connections: Connection[], activeDeviceId: number | null): Promise<void> {
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

  // ==================== Helpers ====================

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

// Export singleton instance
export const ConnectionService = new ConnectionServiceClass();
