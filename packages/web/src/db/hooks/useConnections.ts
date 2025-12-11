import type { NewConnectionInput } from "@app/components/Dialog/AddConnectionDialog/AddConnectionDialog";
import { testHttpReachable } from "@app/pages/Connections/utils";
import { router } from "@app/routes";
import { clearConnectionCache, useDeviceStore } from "@core/stores";
import { randId } from "@core/utils/randId.ts";
import { MeshDevice, Types } from "@meshtastic/core";
import { TransportHTTP } from "@meshtastic/transport-http";
import { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import { type Result, ResultAsync } from "neverthrow";
import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { ConnectionError } from "../errors.ts";
import type {
  ConnectionStatus,
  ConnectionType,
} from "../repositories/ConnectionRepository.ts";
import { connectionRepo } from "../repositories/index.ts";
import type { Connection } from "../schema.ts";
import { SubscriptionService } from "../subscriptionService.ts";

export type { ConnectionStatus, ConnectionType };

// Runtime storage for cleanup only (not persisted)
const transports = new Map<number, BluetoothDevice | SerialPort>();
const heartbeats = new Map<number, ReturnType<typeof setInterval>>();
const dbSubscriptions = new Map<number, () => void>();
const statusSubscriptions = new Map<number, () => void>();

const HEARTBEAT_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Hook to manage connections (CRUD + connect/disconnect)
 */
export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);

  // DeviceStore methods
  const setActiveConnectionId = useDeviceStore((s) => s.setActiveConnectionId);
  const setActiveDeviceId = useDeviceStore((s) => s.setActiveDeviceId);
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const { addDevice } = useDeviceStore();

  const refresh = useCallback(async (): Promise<
    Result<Connection[], ConnectionError>
  > => {
    const result = await ResultAsync.fromPromise(
      connectionRepo.getConnections(),
      (cause: unknown) => ConnectionError.getConnections(cause),
    );
    if (result.isOk()) {
      setConnections(result.value);
    }
    return result;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onDeviceChange = useEffectEvent(() => {
    // Debounce to avoid rapid updates when multiple events fire
    setTimeout(async () => {
      // Check serial port availability
      if ("serial" in navigator) {
        const serial = navigator as Navigator & {
          serial: { getPorts: () => Promise<SerialPort[]> };
        };
        try {
          const ports = await serial.serial.getPorts();
          for (const conn of connections.filter(
            (c) =>
              c.type === "serial" &&
              !["connected", "configured", "configuring"].includes(c.status),
          )) {
            const hasPermission = ports.some((p) => {
              const info =
                (
                  p as SerialPort & {
                    getInfo?: () => {
                      usbVendorId?: number;
                      usbProductId?: number;
                    };
                  }
                ).getInfo?.() ?? {};
              return (
                info.usbVendorId === conn.usbVendorId &&
                info.usbProductId === conn.usbProductId
              );
            });
            await connectionRepo.updateStatus(
              conn.id,
              hasPermission ? "online" : "disconnected",
            );
          }
        } catch {
          // Ignore errors
        }
      }

      // Check bluetooth availability
      if ("bluetooth" in navigator) {
        const bluetooth = navigator.bluetooth as Navigator["bluetooth"] & {
          getDevices?: () => Promise<BluetoothDevice[]>;
        };
        if (bluetooth.getDevices) {
          try {
            const known = await bluetooth.getDevices();
            for (const conn of connections.filter(
              (c) =>
                c.type === "bluetooth" &&
                !["connected", "configured", "configuring"].includes(c.status),
            )) {
              const hasPermission = known?.some((d) => d.id === conn.deviceId);
              await connectionRepo.updateStatus(
                conn.id,
                hasPermission ? "online" : "disconnected",
              );
            }
          } catch {
            // Ignore errors
          }
        }
      }

      await refresh();
    }, 100);
  });

  // Listen for serial device connect/disconnect events
  useEffect(() => {
    if (!("serial" in navigator)) {
      return;
    }

    const serial = navigator.serial as EventTarget;

    serial.addEventListener("connect", onDeviceChange);
    serial.addEventListener("disconnect", onDeviceChange);

    return () => {
      serial.removeEventListener("connect", onDeviceChange);
      serial.removeEventListener("disconnect", onDeviceChange);
    };
  }, []);

  // Listen for Bluetooth device disconnections
  useEffect(() => {
    if (!("bluetooth" in navigator)) {
      return;
    }

    const bluetooth = navigator.bluetooth as Navigator["bluetooth"] & {
      getDevices?: () => Promise<BluetoothDevice[]>;
    };
    if (!bluetooth.getDevices) {
      return;
    }

    let devices: BluetoothDevice[] = [];

    // Set up listeners on known devices
    const setupListeners = async () => {
      try {
        devices = (await bluetooth.getDevices()) ?? [];
        for (const device of devices) {
          device.addEventListener("gattserverdisconnected", onDeviceChange);
        }
      } catch {
        // getDevices may not be supported or may fail
      }
    };

    setupListeners();

    return () => {
      for (const device of devices) {
        device.removeEventListener("gattserverdisconnected", onDeviceChange);
      }
    };
  }, [onDeviceChange]);

  const updateStatus = useCallback(
    async (id: number, status: ConnectionStatus, errorMsg?: string) => {
      await connectionRepo.updateStatus(id, status, errorMsg);
      await refresh();
    },
    [refresh],
  );

  const updateConnection = useCallback(
    async (
      id: number,
      updates: Parameters<typeof connectionRepo.updateConnection>[1],
    ) => {
      await connectionRepo.updateConnection(id, updates);
      await refresh();
    },
    [refresh],
  );

  const linkMeshDevice = useCallback(
    async (id: number, meshDeviceId: number) => {
      await connectionRepo.linkMeshDevice(id, meshDeviceId);
      await refresh();
    },
    [refresh],
  );

  const setupMeshDevice = useCallback(
    async (
      id: number,
      transport:
        | Awaited<ReturnType<typeof TransportHTTP.create>>
        | Awaited<ReturnType<typeof TransportWebBluetooth.createFromDevice>>
        | Awaited<ReturnType<typeof TransportWebSerial.createFromPort>>,
      btDevice?: BluetoothDevice,
      serialPort?: SerialPort,
    ): Promise<number> => {
      const conn = await connectionRepo.getConnection(id);
      const deviceId = conn?.meshDeviceId ?? randId();

      const device = addDevice(deviceId);
      const meshDevice = new MeshDevice(transport, deviceId);

      setActiveDeviceId(deviceId);
      device.addConnection(meshDevice);

      // Subscribe to node info events - updates device store and sets up DB subscriptions
      meshDevice.events.onMyNodeInfo.subscribe((nodeInfo) => {
        // Update device store with hardware info (sets myNodeNum)
        device.setHardware(nodeInfo);
        console.log(
          `[useConnections] Received myNodeInfo, myNodeNum: ${nodeInfo.myNodeNum}`,
        );

        // Set up database subscriptions for this device
        const unsubscribe = SubscriptionService.subscribeToDevice(
          deviceId,
          nodeInfo.myNodeNum,
          meshDevice,
        );
        dbSubscriptions.set(id, unsubscribe);
        console.log(`[DB] Subscribed to device ${deviceId} events`);
      });

      // Subscribe to config events
      meshDevice.events.onConfigPacket.subscribe((config) => {
        console.log(
          `[useConnections] Received config packet: ${config.payloadVariant.case}`,
          config.payloadVariant.value,
        );
        device.setConfig(config);
      });

      meshDevice.events.onModuleConfigPacket.subscribe((config) => {
        console.log(
          `[useConnections] Received module config packet: ${config.payloadVariant.case}`,
          config.payloadVariant.value,
        );
        device.setModuleConfig(config);
      });

      // Navigate to messages when config-only stage completes (nonce 69420)
      const configCompleteUnsub = meshDevice.events.onConfigComplete.subscribe(
        async (configCompleteId) => {
          console.log(
            `[useConnections] Config complete (nonce: ${configCompleteId})`,
          );
          if (configCompleteId === 69420) {
            configCompleteUnsub();
            // Set phase to "connected" so route guard allows navigation
            device.setConnectionPhase("connected");
            await updateStatus(id, "connected");
            router.navigate({ to: "/messages", search: { channel: 0 } });
          }
        },
      );

      // Monitor device status for disconnections (e.g., cable unplugged)
      const statusUnsub = meshDevice.events.onDeviceStatus.subscribe(
        async (status) => {
          if (status === Types.DeviceStatusEnum.DeviceDisconnected) {
            console.log(`[useConnections] Device disconnected (id: ${id})`);
            device.setConnectionPhase("disconnected");
            await connectionRepo.updateStatus(id, "disconnected");
            // Clean up heartbeat
            const heartbeatId = heartbeats.get(id);
            if (heartbeatId) {
              clearInterval(heartbeatId);
              heartbeats.delete(id);
            }
          }
        },
      );
      statusSubscriptions.set(id, statusUnsub);

      if (btDevice || serialPort) {
        transports.set(id, (btDevice || serialPort)!);
      }

      setActiveConnectionId(id);
      device.setConnectionId(id);
      device.setConnectionPhase("configuring");
      await updateStatus(id, "configuring");

      meshDevice
        .configureTwoStage()
        .then(async () => {
          device.setConnectionPhase("configured");
          await updateStatus(id, "configured");

          meshDevice
            .heartbeat()
            .then(() => {
              const maintenanceHeartbeat = setInterval(() => {
                meshDevice.heartbeat().catch(console.warn);
              }, HEARTBEAT_INTERVAL_MS);
              heartbeats.set(id, maintenanceHeartbeat);
            })
            .catch(console.warn);
        })
        .catch(async (err) => {
          await updateStatus(id, "error", err.message);
        });

      await linkMeshDevice(id, deviceId);
      return deviceId;
    },
    [
      addDevice,
      setActiveDeviceId,
      setActiveConnectionId,
      updateStatus,
      linkMeshDevice,
    ],
  );

  const connect = useCallback(
    async (id: number, opts?: { allowPrompt?: boolean }) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) {
        return false;
      }
      if (conn.status === "configured" || conn.status === "connected") {
        return true;
      }

      await updateStatus(id, "connecting");
      try {
        if (conn.type === "http") {
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
          await setupMeshDevice(id, transport);
          return true;
        }

        if (conn.type === "bluetooth") {
          if (!("bluetooth" in navigator))
            throw new Error("Web Bluetooth not supported");
          let bleDevice = transports.get(id) as BluetoothDevice | undefined;
          if (!bleDevice) {
            const getDevices = (
              navigator.bluetooth as Navigator["bluetooth"] & {
                getDevices?: () => Promise<BluetoothDevice[]>;
              }
            ).getDevices;
            if (getDevices) {
              const known = await getDevices();
              bleDevice = known?.find((d) => d.id === conn.deviceId);
            }
          }
          if (!bleDevice && opts?.allowPrompt) {
            bleDevice = await navigator.bluetooth.requestDevice({
              acceptAllDevices: !conn.gattServiceUUID,
              optionalServices: conn.gattServiceUUID
                ? [conn.gattServiceUUID]
                : undefined,
              filters: conn.gattServiceUUID
                ? [{ services: [conn.gattServiceUUID] }]
                : undefined,
            });
          }
          if (!bleDevice) {
            throw new Error(
              "Bluetooth device not available. Re-select the device.",
            );
          }
          const transport =
            await TransportWebBluetooth.createFromDevice(bleDevice);
          await setupMeshDevice(id, transport, bleDevice);
          bleDevice.addEventListener("gattserverdisconnected", () =>
            updateStatus(id, "disconnected"),
          );
          return true;
        }

        if (conn.type === "serial") {
          if (!("serial" in navigator)) {
            throw new Error("Web Serial not supported");
          }
          let port = transports.get(id) as SerialPort | undefined;
          if (!port) {
            const ports = await (
              navigator as Navigator & {
                serial: { getPorts: () => Promise<SerialPort[]> };
              }
            ).serial.getPorts();
            port = ports?.find((p) => {
              const info =
                (
                  p as SerialPort & {
                    getInfo?: () => {
                      usbVendorId?: number;
                      usbProductId?: number;
                    };
                  }
                ).getInfo?.() ?? {};
              return (
                info.usbVendorId === conn.usbVendorId &&
                info.usbProductId === conn.usbProductId
              );
            });
          }
          if (!port && opts?.allowPrompt) {
            port = await (
              navigator as Navigator & {
                serial: {
                  requestPort: (
                    o: Record<string, unknown>,
                  ) => Promise<SerialPort>;
                };
              }
            ).serial.requestPort({});
          }
          if (!port) {
            throw new Error("Serial port not available. Re-select the port.");
          }

          const portWithStreams = port as SerialPort & {
            readable: ReadableStream | null;
            writable: WritableStream | null;
            close: () => Promise<void>;
          };
          if (portWithStreams.readable || portWithStreams.writable) {
            try {
              await portWithStreams.close();
              await new Promise((r) => setTimeout(r, 100));
            } catch {}
          }
          try {
            const transport = await TransportWebSerial.createFromPort(port);
            await setupMeshDevice(id, transport, undefined, port);
          } catch (serialErr: unknown) {
            console.log(serialErr);

            const msg =
              serialErr instanceof Error
                ? serialErr.message
                : String(serialErr);
            // Detect locked/in-use port errors
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
          return true;
        }
      } catch (err: unknown) {
        await updateStatus(
          id,
          "error",
          err instanceof Error ? err.message : String(err),
        );
        return false;
      }
      return false;
    },
    [connections, updateStatus, setupMeshDevice],
  );

  const disconnect = useCallback(
    async (id: number) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) {
        return;
      }

      const heartbeatId = heartbeats.get(id);
      if (heartbeatId) {
        clearInterval(heartbeatId);
        heartbeats.delete(id);
      }

      const unsubDB = dbSubscriptions.get(id);
      if (unsubDB) {
        unsubDB();
        dbSubscriptions.delete(id);
      }

      const unsubStatus = statusSubscriptions.get(id);
      if (unsubStatus) {
        unsubStatus();
        statusSubscriptions.delete(id);
      }

      if (conn.meshDeviceId) {
        const { getDevice } = useDeviceStore.getState();
        const device = getDevice(conn.meshDeviceId);
        try {
          device?.connection?.disconnect();
        } catch {}

        // Clear from HMR cache
        clearConnectionCache(conn.meshDeviceId);

        const transport = transports.get(id);
        if (transport) {
          if (conn.type === "bluetooth") {
            const dev = transport as BluetoothDevice;
            if (dev.gatt?.connected) dev.gatt.disconnect();
          }
          if (conn.type === "serial") {
            const port = transport as SerialPort & {
              close?: () => Promise<void>;
              readable?: ReadableStream | null;
            };
            if (port.close && port.readable) {
              try {
                await port.close();
              } catch {}
            }
          }
        }

        if (device) {
          device.setConnectionId(null);
          device.setConnectionPhase("disconnected");
        }
      }
      await updateConnection(id, { status: "disconnected", error: null });
    },
    [connections, updateConnection],
  );

  const removeConnection = useCallback(
    async (id: number) => {
      const conn = connections.find((c) => c.id === id);
      if (conn?.meshDeviceId) {
        const { getDevice, removeDevice } = useDeviceStore.getState();
        const device = getDevice(conn.meshDeviceId);
        try {
          device?.connection?.disconnect();
        } catch {}

        // Clear from HMR cache
        clearConnectionCache(conn.meshDeviceId);

        try {
          removeDevice(conn.meshDeviceId);
        } catch {}
      }

      const heartbeatId = heartbeats.get(id);
      if (heartbeatId) {
        clearInterval(heartbeatId);
        heartbeats.delete(id);
      }

      const unsubDB = dbSubscriptions.get(id);
      if (unsubDB) {
        unsubDB();
        dbSubscriptions.delete(id);
      }

      const unsubStatus = statusSubscriptions.get(id);
      if (unsubStatus) {
        unsubStatus();
        statusSubscriptions.delete(id);
      }

      const transport = transports.get(id);
      if (transport) {
        const bt = transport as BluetoothDevice;
        if (bt.gatt?.connected) {
          try {
            bt.gatt.disconnect();
          } catch {}
        }
        const sp = transport as SerialPort & { close?: () => Promise<void> };
        if (sp.close) {
          try {
            sp.close();
          } catch {}
        }
        transports.delete(id);
      }

      await connectionRepo.deleteConnection(id);
      await refresh();
    },
    [connections, refresh],
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

  const refreshStatuses = useCallback(async () => {
    const httpChecks = connections
      .filter(
        (c): c is Connection & { type: "http"; url: string } =>
          c.type === "http" &&
          c.url !== null &&
          !["connected", "configured", "configuring"].includes(c.status),
      )
      .map(async (c) => {
        const ok = await testHttpReachable(c.url);
        await connectionRepo.updateStatus(c.id, ok ? "online" : "error");
      });

    const btChecks = connections
      .filter(
        (c) =>
          c.type === "bluetooth" &&
          !["connected", "configured", "configuring"].includes(c.status),
      )
      .map(async (c) => {
        if (!("bluetooth" in navigator)) {
          return;
        }
        try {
          const known = await (
            navigator.bluetooth as Navigator["bluetooth"] & {
              getDevices?: () => Promise<BluetoothDevice[]>;
            }
          ).getDevices?.();
          const hasPermission = known?.some((d) => d.id === c.deviceId);
          await connectionRepo.updateStatus(
            c.id,
            hasPermission ? "online" : "disconnected",
          );
        } catch {
          await connectionRepo.updateStatus(c.id, "disconnected");
        }
      });

    const serialChecks = connections
      .filter(
        (c) =>
          c.type === "serial" &&
          !["connected", "configured", "configuring"].includes(c.status),
      )
      .map(async (c) => {
        if (!("serial" in navigator)) {
          return;
        }
        try {
          const ports = await (
            navigator as Navigator & {
              serial: { getPorts: () => Promise<SerialPort[]> };
            }
          ).serial.getPorts();
          const hasPermission = ports.some((p) => {
            const info =
              (
                p as SerialPort & {
                  getInfo?: () => {
                    usbVendorId?: number;
                    usbProductId?: number;
                  };
                }
              ).getInfo?.() ?? {};
            return (
              info.usbVendorId === c.usbVendorId &&
              info.usbProductId === c.usbProductId
            );
          });
          await connectionRepo.updateStatus(
            c.id,
            hasPermission ? "online" : "disconnected",
          );
        } catch {
          await connectionRepo.updateStatus(c.id, "disconnected");
        }
      });

    await Promise.all([...httpChecks, ...btChecks, ...serialChecks]);
    await refresh();
  }, [connections, refresh]);

  const syncConnectionStatuses = useCallback(async () => {
    const activeConnection = connections.find(
      (c) => c.meshDeviceId === activeDeviceId,
    );
    for (const conn of connections) {
      const shouldBeConnected = activeConnection?.id === conn.id;
      const isConnectedState = [
        "connected",
        "configured",
        "configuring",
      ].includes(conn.status);
      if (!shouldBeConnected && isConnectedState) {
        await connectionRepo.updateStatus(conn.id, "disconnected");
      }
    }
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
 * Hook to fetch a single connection
 */
export function useConnection(id: number) {
  const [connection, setConnection] = useState<Connection | undefined>(
    undefined,
  );

  const refresh = useCallback(async (): Promise<
    Result<Connection | undefined, ConnectionError>
  > => {
    const result = await ResultAsync.fromPromise(
      connectionRepo.getConnection(id),
      (cause: unknown) => ConnectionError.getConnection(id, cause),
    );
    if (result.isOk()) {
      setConnection(result.value);
    }
    return result;
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { connection, refresh };
}

/**
 * Hook to fetch the default connection
 */
export function useDefaultConnection() {
  const [connection, setConnection] = useState<Connection | undefined>(
    undefined,
  );

  const refresh = useCallback(async (): Promise<
    Result<Connection | undefined, ConnectionError>
  > => {
    const result = await ResultAsync.fromPromise(
      connectionRepo.getDefaultConnection(),
      (cause: unknown) => ConnectionError.getDefaultConnection(cause),
    );
    if (result.isOk()) {
      setConnection(result.value);
    }
    return result;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { connection, refresh };
}

/**
 * Reset all connection statuses on app startup
 */
export async function resetConnectionStatuses(): Promise<void> {
  await connectionRepo.resetAllStatuses();
}
