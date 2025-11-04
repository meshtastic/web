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
import { useCallback, useRef } from "react";

type LiveRefs = {
  bt: Map<ConnectionId, BluetoothDevice>;
  serial: Map<ConnectionId, SerialPort>;
  meshDevices: Map<ConnectionId, MeshDevice>;
};

export function useConnections() {
  const connections = useDeviceStore((s) => s.savedConnections);

  const addSavedConnection = useDeviceStore((s) => s.addSavedConnection);
  const updateSavedConnection = useDeviceStore((s) => s.updateSavedConnection);
  const removeSavedConnectionFromStore = useDeviceStore(
    (s) => s.removeSavedConnection,
  );

  const live = useRef<LiveRefs>({
    bt: new Map(),
    serial: new Map(),
    meshDevices: new Map(),
  });
  const { addDevice } = useDeviceStore();
  const { addNodeDB } = useNodeDBStore();
  const { addMessageStore } = useMessageStore();
  const { setSelectedDevice } = useAppStore();

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
      // Disconnect MeshDevice first
      const meshDevice = live.current.meshDevices.get(id);
      if (meshDevice) {
        try {
          meshDevice.disconnect();
        } catch {}
        live.current.meshDevices.delete(id);
      }

      // Close live refs if open
      const bt = live.current.bt.get(id);
      if (bt?.gatt?.connected) {
        try {
          bt.gatt.disconnect();
        } catch {
          // Ignore errors
        }
      }
      const sp = live.current.serial.get(id);
      if (sp && "close" in sp) {
        try {
          (sp as SerialPort & { close: () => Promise<void> }).close();
        } catch {
          // Ignore errors
        }
      }
      live.current.bt.delete(id);
      live.current.serial.delete(id);
      removeSavedConnectionFromStore(id);
    },
    [removeSavedConnectionFromStore],
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
      options?: {
        setHeartbeat?: boolean;
        onDisconnect?: () => void;
      },
    ): number => {
      const deviceId = randId();
      const device = addDevice(deviceId);
      const nodeDB = addNodeDB(deviceId);
      const messageStore = addMessageStore(deviceId);
      const meshDevice = new MeshDevice(transport, deviceId);
      meshDevice.configure();
      setSelectedDevice(deviceId);
      device.addConnection(meshDevice);
      subscribeAll(device, meshDevice, messageStore, nodeDB);
      live.current.meshDevices.set(id, meshDevice);

      if (options?.setHeartbeat) {
        const HEARTBEAT_INTERVAL = 5 * 60 * 1000;
        meshDevice.setHeartbeatInterval(HEARTBEAT_INTERVAL);
      }

      updateSavedConnection(id, { meshDeviceId: deviceId });
      return deviceId;
    },
    [
      addDevice,
      addNodeDB,
      addMessageStore,
      setSelectedDevice,
      updateSavedConnection,
    ],
  );

  const connect = useCallback(
    async (id: ConnectionId, opts?: { allowPrompt?: boolean }) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) {
        return false;
      }
      if (conn.status === "connected") {
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
          updateStatus(id, "connected");
          return true;
        }

        if (conn.type === "bluetooth") {
          if (!("bluetooth" in navigator)) {
            throw new Error("Web Bluetooth not supported");
          }
          let bleDevice = live.current.bt.get(id);
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
                // If found, store it for future use
                if (bleDevice) {
                  live.current.bt.set(id, bleDevice);
                }
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
          live.current.bt.set(id, bleDevice);

          const transport =
            await TransportWebBluetooth.createFromDevice(bleDevice);
          setupMeshDevice(id, transport, { setHeartbeat: true });

          bleDevice.addEventListener("gattserverdisconnected", () => {
            updateStatus(id, "disconnected");
          });

          updateStatus(id, "connected");
          return true;
        }

        if (conn.type === "serial") {
          if (!("serial" in navigator)) {
            throw new Error("Web Serial not supported");
          }
          let port = live.current.serial.get(id);
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

          live.current.serial.set(id, port);

          const transport = await TransportWebSerial.createFromPort(port);
          setupMeshDevice(id, transport, { setHeartbeat: true });
          updateStatus(id, "connected");
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
        // Disconnect MeshDevice first
        const meshDevice = live.current.meshDevices.get(id);
        if (meshDevice) {
          try {
            meshDevice.disconnect();
          } catch {
            // Ignore errors
          }
          live.current.meshDevices.delete(id);
        }

        if (conn.type === "bluetooth") {
          const dev = live.current.bt.get(id);
          if (dev?.gatt?.connected) {
            dev.gatt.disconnect();
          }
        }
        if (conn.type === "serial") {
          const port = live.current.serial.get(id);
          if (port) {
            try {
              const portWithClose = port as SerialPort & {
                close: () => Promise<void>;
                readable: ReadableStream | null;
              };
              // Only close if the port is open (has readable stream)
              if (portWithClose.readable) {
                await portWithClose.close();
              }
            } catch (err) {
              console.warn("Error closing serial port:", err);
            }
            live.current.serial.delete(id);
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
        live.current.bt.set(conn.id, btDevice);
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

    // HTTP connections: test reachability if not already connected
    const httpChecks = connections
      .filter(
        (c): c is Connection & { type: "http"; url: string } =>
          c.type === "http" && c.status !== "connected",
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
          c.type === "bluetooth" && c.status !== "connected",
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
        } => c.type === "serial" && c.status !== "connected",
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

  return {
    connections,
    addConnection,
    addConnectionAndConnect,
    connect,
    disconnect,
    removeConnection,
    setDefaultConnection,
    refreshStatuses,
  };
}
