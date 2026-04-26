import {
  startConfigHeartbeat,
  startMaintenanceHeartbeat,
  stopHeartbeat,
} from "@app/core/connections/heartbeat.ts";
import { buildMeshDevice } from "@app/core/connections/sdkClient.ts";
import {
  closeTransport,
  openTransport,
  probeConnection,
} from "@app/core/connections/transports.ts";
import type {
  Connection,
  ConnectionId,
  ConnectionStatus,
  NewConnection,
} from "@app/core/stores/deviceStore/types";
import { createConnectionFromInput } from "@app/pages/Connections/utils";
import { meshRegistry } from "@core/meshRegistry.ts";
import { useAppStore, useDeviceStore } from "@core/stores";
import { subscribeAll } from "@core/subscriptions.ts";
import { randId } from "@core/utils/randId.ts";
import { useCallback } from "react";

// Per-connection out-of-band handles tracked outside Zustand:
//   - cachedTransports: held BT device / serial port for reconnect + cleanup.
//   - configSubscriptions: onConfigComplete unsubscribers.
const cachedTransports = new Map<ConnectionId, BluetoothDevice | SerialPort>();
const configSubscriptions = new Map<ConnectionId, () => void>();

export function useConnections() {
  const connections = useDeviceStore((s) => s.savedConnections);
  const addSavedConnection = useDeviceStore((s) => s.addSavedConnection);
  const updateSavedConnection = useDeviceStore((s) => s.updateSavedConnection);
  const removeSavedConnectionFromStore = useDeviceStore((s) => s.removeSavedConnection);
  const setActiveConnectionId = useDeviceStore((s) => s.setActiveConnectionId);
  const { addDevice } = useDeviceStore();
  const { setSelectedDevice } = useAppStore();
  const selectedDeviceId = useAppStore((s) => s.selectedDeviceId);

  const updateStatus = useCallback(
    (id: ConnectionId, status: ConnectionStatus, error?: string) => {
      updateSavedConnection(id, {
        status,
        error: error || undefined,
        ...(status === "disconnected" ? { lastConnectedAt: Date.now() } : {}),
      });
    },
    [updateSavedConnection],
  );

  const teardown = useCallback((id: ConnectionId, conn?: Connection) => {
    stopHeartbeat(id);
    configSubscriptions.get(id)?.();
    configSubscriptions.delete(id);

    if (conn?.meshDeviceId) {
      const device = useDeviceStore.getState().getDevice(conn.meshDeviceId);
      try {
        device?.connection?.disconnect();
      } catch {}
    }
    closeTransport(cachedTransports.get(id));
    cachedTransports.delete(id);
  }, []);

  const removeConnection = useCallback(
    (id: ConnectionId) => {
      const conn = connections.find((c) => c.id === id);
      teardown(id, conn);
      if (conn?.meshDeviceId) {
        try {
          useDeviceStore.getState().removeDevice(conn.meshDeviceId);
        } catch {}
      }
      meshRegistry.unregister(id);
      removeSavedConnectionFromStore(id);
    },
    [connections, removeSavedConnectionFromStore, teardown],
  );

  const setDefaultConnection = useCallback(
    (id: ConnectionId) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) return;
      updateSavedConnection(id, { isDefault: !conn.isDefault });
    },
    [connections, updateSavedConnection],
  );

  const setupMeshDevice = useCallback(
    async (
      id: ConnectionId,
      transport: Awaited<ReturnType<typeof openTransport>>["transport"],
      bluetoothDevice?: BluetoothDevice,
      serialPort?: SerialPort,
    ): Promise<number> => {
      // Reuse existing meshDeviceId if the device entry still exists; otherwise mint a new one.
      const conn = connections.find((c) => c.id === id);
      let deviceId = conn?.meshDeviceId;
      if (deviceId && !useDeviceStore.getState().getDevice(deviceId)) {
        deviceId = undefined;
      }
      deviceId = deviceId ?? randId();

      const device = addDevice(deviceId);
      const meshDevice = await buildMeshDevice(id, deviceId, transport);

      if (!meshRegistry.has(id)) {
        meshRegistry.register(id, meshDevice.meshClient);
      }
      meshRegistry.setActive(id);

      setSelectedDevice(deviceId);
      device.addConnection(meshDevice);
      subscribeAll(device, meshDevice);

      const cached = bluetoothDevice ?? serialPort;
      if (cached) cachedTransports.set(id, cached);

      setActiveConnectionId(id);
      device.setConnectionId(id);

      const unsubConfigComplete = meshDevice.events.onConfigComplete.subscribe(() => {
        device.setConnectionPhase("configured");
        updateStatus(id, "configured");
        startMaintenanceHeartbeat(id, meshDevice);
      });
      configSubscriptions.set(id, unsubConfigComplete);

      device.setConnectionPhase("configuring");
      updateStatus(id, "configuring");

      meshDevice
        .configure()
        .then(() => meshDevice.heartbeat().then(() => startConfigHeartbeat(id, meshDevice)))
        .catch((error) => {
          console.error("[useConnections] configure failed:", error);
          updateStatus(id, "error", error?.message ?? String(error));
        });

      updateSavedConnection(id, { meshDeviceId: deviceId });
      return deviceId;
    },
    [
      connections,
      addDevice,
      setSelectedDevice,
      setActiveConnectionId,
      updateSavedConnection,
      updateStatus,
    ],
  );

  const connect = useCallback(
    async (id: ConnectionId, opts?: { allowPrompt?: boolean }) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) return false;
      if (conn.status === "configured" || conn.status === "connected") return true;

      updateStatus(id, "connecting");
      try {
        const cached = cachedTransports.get(id);
        const result = await openTransport(conn, {
          allowPrompt: opts?.allowPrompt,
          cachedBluetoothDevice:
            conn.type === "bluetooth" ? (cached as BluetoothDevice | undefined) : undefined,
          cachedSerialPort: conn.type === "serial" ? (cached as SerialPort | undefined) : undefined,
        });
        await setupMeshDevice(id, result.transport, result.bluetoothDevice, result.serialPort);

        // BT-specific: catch device-side disconnect to flip status.
        result.bluetoothDevice?.addEventListener("gattserverdisconnected", () => {
          updateStatus(id, "disconnected");
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        updateStatus(id, "error", message);
        return false;
      }
    },
    [connections, updateStatus, setupMeshDevice],
  );

  const disconnect = useCallback(
    async (id: ConnectionId) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) return;
      try {
        teardown(id, conn);
        if (conn.meshDeviceId) {
          const device = useDeviceStore.getState().getDevice(conn.meshDeviceId);
          if (device) {
            device.setConnectionId(null);
            device.setConnectionPhase("disconnected");
          }
        }
      } finally {
        updateSavedConnection(id, { status: "disconnected", error: undefined });
      }
    },
    [connections, updateSavedConnection, teardown],
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
      if (btDevice && conn.type === "bluetooth") cachedTransports.set(conn.id, btDevice);
      await connect(conn.id, { allowPrompt: true });
      return conn;
    },
    [addConnection, connect],
  );

  const refreshStatuses = useCallback(async () => {
    const candidates = connections.filter(
      (c) => c.status !== "connected" && c.status !== "configured" && c.status !== "configuring",
    );
    await Promise.all(
      candidates.map(async (c) => {
        const status = await probeConnection(c);
        updateSavedConnection(c.id, { status });
      }),
    );
  }, [connections, updateSavedConnection]);

  const syncConnectionStatuses = useCallback(() => {
    const activeConnection = connections.find((c) => c.meshDeviceId === selectedDeviceId);
    connections.forEach((conn) => {
      const shouldBeConnected = activeConnection?.id === conn.id;
      const isConnectedState =
        conn.status === "connected" ||
        conn.status === "configured" ||
        conn.status === "configuring";
      if (!shouldBeConnected && isConnectedState) {
        updateSavedConnection(conn.id, { status: "disconnected" });
      }
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
