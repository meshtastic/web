import type {
  Connection,
  ConnectionId,
  ConnectionStatus,
  NewConnection,
} from "@app/core/stores/deviceStore/types";
import {
  createConnectionFromInput,
  testHttpReachable,
} from "@app/pages/Connections/utils";
import {
  useAppStore,
  useDeviceStore,
  useMessageStore,
  useNodeDBStore,
} from "@core/stores";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import { MeshDevice } from "@meshtastic/core";
import { TransportHTTP } from "@meshtastic/transport-http";
import { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import { useCallback } from "react";

// Local storage for cleanup only (not in Zustand)
const transports = new Map<ConnectionId, BluetoothDevice | SerialPort>();
const heartbeats = new Map<ConnectionId, ReturnType<typeof setInterval>>();
const configSubscriptions = new Map<ConnectionId, () => void>();

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const CONFIG_HEARTBEAT_INTERVAL_MS = 5000; // 5s during configuration

export function useConnections() {
  const connections = useDeviceStore((s) => s.savedConnections);

  const addSavedConnection = useDeviceStore((s) => s.addSavedConnection);
  const updateSavedConnection = useDeviceStore((s) => s.updateSavedConnection);
  const removeSavedConnectionFromStore = useDeviceStore(
    (s) => s.removeSavedConnection,
  );

  // DeviceStore methods
  const setActiveConnectionId = useDeviceStore((s) => s.setActiveConnectionId);

  const { addDevice } = useDeviceStore();
  const { addNodeDB } = useNodeDBStore();
  const { addMessageStore } = useMessageStore();
  const { setSelectedDevice } = useAppStore();
  const selectedDeviceId = useAppStore((s) => s.selectedDeviceId);

  const updateStatus = useCallback(
    (id: ConnectionId, status: ConnectionStatus, error?: string) => {
      const updates: Partial<Connection> = {
        status,
        error: error || undefined,
        ...(status === "disconnected" ? { lastConnectedAt: Date.now() } : {}),
      };
      updateSavedConnection(id, updates);
    },
    [updateSavedConnection],
  );

  const removeConnection = useCallback(
    (id: ConnectionId) => {
      const conn = connections.find((c) => c.id === id);

      // Stop heartbeat
      const heartbeatId = heartbeats.get(id);
      if (heartbeatId) {
        clearInterval(heartbeatId);
        heartbeats.delete(id);
        console.log(`[useConnections] Heartbeat stopped for connection ${id}`);
      }

      // Unsubscribe from config complete event
      const unsubConfigComplete = configSubscriptions.get(id);
      if (unsubConfigComplete) {
        unsubConfigComplete();
        configSubscriptions.delete(id);
        console.log(
          `[useConnections] Config subscription cleaned up for connection ${id}`,
        );
      }

      // Get device and MeshDevice from Device.connection
      if (conn?.meshDeviceId) {
        const { getDevice, removeDevice } = useDeviceStore.getState();
        const device = getDevice(conn.meshDeviceId);

        if (device?.connection) {
          // Disconnect MeshDevice
          try {
            device.connection.disconnect();
          } catch {}
        }

        // Close transport if it's BT or Serial
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

        // Clean up orphaned Device
        try {
          removeDevice(conn.meshDeviceId);
        } catch {}
      }

      removeSavedConnectionFromStore(id);
    },
    [connections, removeSavedConnectionFromStore],
  );

  const setDefaultConnection = useCallback(
    (id: ConnectionId) => {
      for (const connection of connections) {
        if (connection.id === id) {
          updateSavedConnection(connection.id, {
            isDefault: !connection.isDefault,
          });
        }
      }
    },
    [connections, updateSavedConnection],
  );

  const setupMeshDevice = useCallback(
    (
      id: ConnectionId,
      transport:
        | Awaited<ReturnType<typeof TransportHTTP.create>>
        | Awaited<ReturnType<typeof TransportWebBluetooth.createFromDevice>>
        | Awaited<ReturnType<typeof TransportWebSerial.createFromPort>>,
      btDevice?: BluetoothDevice,
      serialPort?: SerialPort,
    ): number => {
      // Reuse existing meshDeviceId if available to prevent duplicate nodeDBs,
      // but only if the corresponding nodeDB still exists. Otherwise, generate a new ID.
      const conn = connections.find((c) => c.id === id);
      let deviceId = conn?.meshDeviceId;
      if (deviceId && !useNodeDBStore.getState().getNodeDB(deviceId)) {
        deviceId = undefined;
      }
      deviceId = deviceId ?? randId();

      const device = addDevice(deviceId);
      const nodeDB = addNodeDB(deviceId);
      const messageStore = addMessageStore(deviceId);
      const meshDevice = new MeshDevice(transport, deviceId);

      setSelectedDevice(deviceId);
      device.addConnection(meshDevice); // This stores meshDevice in Device.connection
      subscribeAll(device, meshDevice, messageStore, nodeDB);

      // Store transport locally for cleanup (BT/Serial only)
      if (btDevice || serialPort) {
        transports.set(id, btDevice || serialPort);
      }

      // Set active connection and link device bidirectionally
      setActiveConnectionId(id);
      device.setConnectionId(id);

      // Listen for config complete event (with nonce/ID)
      const unsubConfigComplete = meshDevice.events.onConfigComplete.subscribe(
        (configCompleteId) => {
          console.log(
            `[useConnections] Configuration complete with ID: ${configCompleteId}`,
          );
          device.setConnectionPhase("configured");
          updateStatus(id, "configured");

          // Switch from fast config heartbeat to slow maintenance heartbeat
          const oldHeartbeat = heartbeats.get(id);
          if (oldHeartbeat) {
            clearInterval(oldHeartbeat);
            console.log(
              `[useConnections] Switching to maintenance heartbeat (5 min interval)`,
            );
          }

          const maintenanceHeartbeat = setInterval(() => {
            meshDevice.heartbeat().catch((error) => {
              console.warn("[useConnections] Heartbeat failed:", error);
            });
          }, HEARTBEAT_INTERVAL_MS);
          heartbeats.set(id, maintenanceHeartbeat);
        },
      );
      configSubscriptions.set(id, unsubConfigComplete);

      // Start configuration
      device.setConnectionPhase("configuring");
      updateStatus(id, "configuring");
      console.log("[useConnections] Starting configuration");

      meshDevice
        .configure()
        .then(() => {
          console.log(
            "[useConnections] Configuration complete, starting heartbeat",
          );
          // Send initial heartbeat after configure completes
          meshDevice
            .heartbeat()
            .then(() => {
              // Start fast heartbeat after first successful heartbeat
              const configHeartbeatId = setInterval(() => {
                meshDevice.heartbeat().catch((error) => {
                  console.warn(
                    "[useConnections] Config heartbeat failed:",
                    error,
                  );
                });
              }, CONFIG_HEARTBEAT_INTERVAL_MS);
              heartbeats.set(id, configHeartbeatId);
              console.log(
                `[useConnections] Heartbeat started for connection ${id} (5s interval during config)`,
              );
            })
            .catch((error) => {
              console.warn("[useConnections] Initial heartbeat failed:", error);
            });
        })
        .catch((error) => {
          console.error(`[useConnections] Failed to configure:`, error);
          updateStatus(id, "error", error.message);
        });

      updateSavedConnection(id, { meshDeviceId: deviceId });
      return deviceId;
    },
    [
      connections,
      addDevice,
      addNodeDB,
      addMessageStore,
      setSelectedDevice,
      setActiveConnectionId,
      updateSavedConnection,
      updateStatus,
    ],
  );

  const connect = useCallback(
    async (id: ConnectionId, opts?: { allowPrompt?: boolean }) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) {
        return false;
      }
      if (conn.status === "configured" || conn.status === "connected") {
        return true;
      }

      updateStatus(id, "connecting");
      try {
        if (conn.type === "http") {
          const ok = await testHttpReachable(conn.url);
          if (!ok) {
            const url = new URL(conn.url);
            const isHTTPS = url.protocol === "https:";
            const message = isHTTPS
              ? `Cannot reach HTTPS endpoint. If using a self-signed certificate, open ${conn.url} in a new tab, accept the certificate warning, then try connecting again.`
              : "HTTP endpoint not reachable (may be blocked by CORS)";
            throw new Error(message);
          }

          const url = new URL(conn.url);
          const isTLS = url.protocol === "https:";
          const transport = await TransportHTTP.create(url.host, isTLS);
          setupMeshDevice(id, transport);
          // Status will be set to "configured" by onConfigComplete event
          return true;
        }

        if (conn.type === "bluetooth") {
          if (!("bluetooth" in navigator)) {
            throw new Error("Web Bluetooth not supported");
          }
          let bleDevice = transports.get(id) as BluetoothDevice | undefined;
          if (!bleDevice) {
            // Try to recover permitted devices
            const getDevices = (
              navigator.bluetooth as Navigator["bluetooth"] & {
                getDevices?: () => Promise<BluetoothDevice[]>;
              }
            ).getDevices;

            if (getDevices) {
              const known = await getDevices();
              if (known && known.length > 0 && conn.deviceId) {
                bleDevice = known.find(
                  (d: BluetoothDevice) => d.id === conn.deviceId,
                );
              }
            }
          }
          if (!bleDevice && opts?.allowPrompt) {
            // Prompt user to reselect (filter by optional service if provided)
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
          setupMeshDevice(id, transport, bleDevice);

          bleDevice.addEventListener("gattserverdisconnected", () => {
            updateStatus(id, "disconnected");
          });

          // Status will be set to "configured" by onConfigComplete event
          return true;
        }

        if (conn.type === "serial") {
          if (!("serial" in navigator)) {
            throw new Error("Web Serial not supported");
          }
          let port = transports.get(id) as SerialPort | undefined;
          if (!port) {
            // Find a previously granted port by vendor/product
            const ports: SerialPort[] = await (
              navigator as Navigator & {
                serial: { getPorts: () => Promise<SerialPort[]> };
              }
            ).serial.getPorts();
            if (ports && conn.usbVendorId && conn.usbProductId) {
              port = ports.find((p: SerialPort) => {
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
          }
          if (!port && opts?.allowPrompt) {
            port = await (
              navigator as Navigator & {
                serial: {
                  requestPort: (
                    options: Record<string, unknown>,
                  ) => Promise<SerialPort>;
                };
              }
            ).serial.requestPort({});
          }
          if (!port) {
            throw new Error("Serial port not available. Re-select the port.");
          }

          // Ensure the port is closed before opening it
          const portWithStreams = port as SerialPort & {
            readable: ReadableStream | null;
            writable: WritableStream | null;
            close: () => Promise<void>;
          };
          if (portWithStreams.readable || portWithStreams.writable) {
            try {
              await portWithStreams.close();
              await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (err) {
              console.warn("Error closing port before reconnect:", err);
            }
          }

          const transport = await TransportWebSerial.createFromPort(port);
          setupMeshDevice(id, transport, undefined, port);
          // Status will be set to "configured" by onConfigComplete event
          return true;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        updateStatus(id, "error", message);
        return false;
      }
      return false;
    },
    [connections, updateStatus, setupMeshDevice],
  );

  const disconnect = useCallback(
    async (id: ConnectionId) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) {
        return;
      }
      try {
        // Stop heartbeat
        const heartbeatId = heartbeats.get(id);
        if (heartbeatId) {
          clearInterval(heartbeatId);
          heartbeats.delete(id);
          console.log(
            `[useConnections] Heartbeat stopped for connection ${id}`,
          );
        }

        // Unsubscribe from config complete event
        const unsubConfigComplete = configSubscriptions.get(id);
        if (unsubConfigComplete) {
          unsubConfigComplete();
          configSubscriptions.delete(id);
          console.log(
            `[useConnections] Config subscription cleaned up for connection ${id}`,
          );
        }

        // Get device and meshDevice from Device.connection
        if (conn.meshDeviceId) {
          const { getDevice } = useDeviceStore.getState();
          const device = getDevice(conn.meshDeviceId);

          if (device?.connection) {
            // Disconnect MeshDevice
            try {
              device.connection.disconnect();
            } catch {
              // Ignore errors
            }
          }

          // Close transport connections
          const transport = transports.get(id);
          if (transport) {
            if (conn.type === "bluetooth") {
              const dev = transport as BluetoothDevice;
              if (dev.gatt?.connected) {
                dev.gatt.disconnect();
              }
            }
            if (conn.type === "serial") {
              const port = transport as SerialPort & {
                close?: () => Promise<void>;
                readable?: ReadableStream | null;
              };
              if (port.close && port.readable) {
                try {
                  await port.close();
                } catch (err) {
                  console.warn("Error closing serial port:", err);
                }
              }
            }
          }

          // Clear the device's connectionId link
          if (device) {
            device.setConnectionId(null);
            device.setConnectionPhase("disconnected");
          }
        }
      } finally {
        updateSavedConnection(id, {
          status: "disconnected",
          error: undefined,
        });
      }
    },
    [connections, updateSavedConnection],
  );

  const addConnection = useCallback(
    (input: NewConnection) => {
      const conn = createConnectionFromInput(input);
      addSavedConnection(conn);
      return conn;
    },
    [addSavedConnection],
  );

  const addConnectionAndConnect = useCallback(
    async (input: NewConnection, btDevice?: BluetoothDevice) => {
      const conn = addConnection(input);
      // If a Bluetooth device was provided, store it to avoid re-prompting
      if (btDevice && conn.type === "bluetooth") {
        transports.set(conn.id, btDevice);
      }
      await connect(conn.id, { allowPrompt: true });
      // Get updated connection from store after connect
      if (conn.id) {
        return conn;
      }
    },
    [addConnection, connect],
  );

  const refreshStatuses = useCallback(async () => {
    // Check reachability/availability without auto-connecting
    // HTTP: test endpoint reachability
    // Bluetooth/Serial: check permission grants

    // HTTP connections: test reachability if not already connected/configured
    const httpChecks = connections
      .filter(
        (c): c is Connection & { type: "http"; url: string } =>
          c.type === "http" &&
          c.status !== "connected" &&
          c.status !== "configured" &&
          c.status !== "configuring",
      )
      .map(async (c) => {
        const ok = await testHttpReachable(c.url);
        updateSavedConnection(c.id, {
          status: ok ? "online" : "error",
        });
      });

    // Bluetooth connections: check permission grants
    const btChecks = connections
      .filter(
        (c): c is Connection & { type: "bluetooth"; deviceId?: string } =>
          c.type === "bluetooth" &&
          c.status !== "connected" &&
          c.status !== "configured" &&
          c.status !== "configuring",
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
          const hasPermission = known?.some(
            (d: BluetoothDevice) => d.id === c.deviceId,
          );
          updateSavedConnection(c.id, {
            status: hasPermission ? "configured" : "disconnected",
          });
        } catch {
          // getDevices not supported or failed
          updateSavedConnection(c.id, { status: "disconnected" });
        }
      });

    // Serial connections: check permission grants
    const serialChecks = connections
      .filter(
        (
          c,
        ): c is Connection & {
          type: "serial";
          usbVendorId?: number;
          usbProductId?: number;
        } =>
          c.type === "serial" &&
          c.status !== "connected" &&
          c.status !== "configured" &&
          c.status !== "configuring",
      )
      .map(async (c) => {
        if (!("serial" in navigator)) {
          return;
        }
        try {
          const ports: SerialPort[] = await (
            navigator as Navigator & {
              serial: { getPorts: () => Promise<SerialPort[]> };
            }
          ).serial.getPorts();
          const hasPermission = ports.some((p: SerialPort) => {
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
          updateSavedConnection(c.id, {
            status: hasPermission ? "configured" : "disconnected",
          });
        } catch {
          // getPorts failed
          updateSavedConnection(c.id, { status: "disconnected" });
        }
      });

    await Promise.all([...httpChecks, ...btChecks, ...serialChecks]);
  }, [connections, updateSavedConnection]);

  const syncConnectionStatuses = useCallback(() => {
    // Find which connection corresponds to the currently selected device
    const activeConnection = connections.find(
      (c) => c.meshDeviceId === selectedDeviceId,
    );

    // Update all connection statuses
    connections.forEach((conn) => {
      const shouldBeConnected = activeConnection?.id === conn.id;
      const isConnectedState =
        conn.status === "connected" ||
        conn.status === "configured" ||
        conn.status === "configuring";

      // Update status if it doesn't match reality
      if (!shouldBeConnected && isConnectedState) {
        updateSavedConnection(conn.id, { status: "disconnected" });
      }
      // Don't force status to "connected" if shouldBeConnected - let the connection flow set the proper status
    });
  }, [connections, selectedDeviceId, updateSavedConnection]);

  return {
    connections,
    addConnection,
    addConnectionAndConnect,
    connect,
    disconnect,
    removeConnection,
    setDefaultConnection,
    refreshStatuses,
    syncConnectionStatuses,
  };
}
