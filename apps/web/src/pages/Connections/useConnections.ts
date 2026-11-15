import { buildMeshDevice } from "@app/core/connections/sdkClient.ts";
import {
  type BluetoothConnection,
  type ConnectionHandle,
  knownBluetoothDevice,
  permittedSerialPort,
  pickBluetoothDevice,
  pickSerialPort,
  probeConnection,
  type SerialConnection,
} from "@app/core/connections/browserDevices.ts";
import {
  type BluetoothTarget,
  createBluetoothClient,
  createHttpClient,
  createSerialClient,
  type MeshtasticClient,
  type SerialTarget,
} from "@core/kmp/client.ts";
import { editorFor } from "@core/kmp/configEditorIo.ts";
import {
  connectFailure,
  reconnectAttempt,
  toConnectionStatus,
} from "@core/kmp/connectionState.ts";
import { kmpTransport } from "@core/kmp/transport.ts";
import { toast } from "@core/hooks/useToast.ts";
import { createLogger } from "@core/log.ts";
import { MIN_FIRMWARE_VERSION } from "@core/utils/firmware.ts";
import {
  DeviceStatusEnum,
  FirmwareTooOldError,
  type Transport,
} from "@meshtastic/sdk";
import { t } from "i18next";

const log = createLogger("useConnections");
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
//   - heldSerialPorts / heldBluetoothDevices: the port or device the user
//     picked, so later connects reuse it without prompting.
//   - configSubscriptions: handshake status / reboot unsubscribers.
const heldSerialPorts = new Map<ConnectionId, SerialPort>();
const heldBluetoothDevices = new Map<ConnectionId, BluetoothDevice>();
const configSubscriptions = new Map<ConnectionId, () => void>();
// Kotlin SDK connection-state subscriptions for connections it owns.
const kmpSubscriptions = new Map<ConnectionId, () => void>();

/**
 * What the SDK opens for a serial connection. Automatic connects pass only
 * the saved USB ids and the SDK reopens the permitted port itself; a click
 * (`allowPrompt`) may show the port picker when no permitted port matches,
 * and hands the chosen port over.
 */
async function serialTarget(
  conn: SerialConnection,
  allowPrompt: boolean,
): Promise<SerialTarget> {
  const ids = {
    usbVendorId: conn.usbVendorId,
    usbProductId: conn.usbProductId,
  };
  const held = heldSerialPorts.get(conn.id);
  if (held) {
    return { port: held, ...ids };
  }
  if (!allowPrompt) {
    return ids;
  }
  const port =
    (await permittedSerialPort(conn)) ?? (await pickSerialPort(conn));
  heldSerialPorts.set(conn.id, port);
  const info = port.getInfo();
  if (
    info.usbVendorId !== conn.usbVendorId ||
    info.usbProductId !== conn.usbProductId
  ) {
    useDeviceStore.getState().updateSavedConnection(conn.id, {
      usbVendorId: info.usbVendorId,
      usbProductId: info.usbProductId,
    });
  }
  return {
    port,
    usbVendorId: info.usbVendorId,
    usbProductId: info.usbProductId,
  };
}

async function bluetoothTarget(
  conn: BluetoothConnection,
  allowPrompt: boolean,
): Promise<BluetoothTarget> {
  const held = heldBluetoothDevices.get(conn.id);
  if (held) {
    return { device: held, deviceId: conn.deviceId };
  }
  if (!allowPrompt) {
    return { deviceId: conn.deviceId };
  }
  const device =
    (await knownBluetoothDevice(conn)) ?? (await pickBluetoothDevice());
  heldBluetoothDevices.set(conn.id, device);
  if (device.id !== conn.deviceId) {
    useDeviceStore.getState().updateSavedConnection(conn.id, {
      deviceId: device.id,
      deviceName: device.name,
    });
  }
  return { device, deviceId: device.id };
}

export function useConnections() {
  const connections = useDeviceStore((s) => s.savedConnections);
  const addSavedConnection = useDeviceStore((s) => s.addSavedConnection);
  const updateSavedConnection = useDeviceStore((s) => s.updateSavedConnection);
  const removeSavedConnectionFromStore = useDeviceStore(
    (s) => s.removeSavedConnection,
  );
  const setActiveConnectionId = useDeviceStore((s) => s.setActiveConnectionId);
  const { addDevice } = useDeviceStore();
  const { setSelectedDevice } = useAppStore();
  const selectedDeviceId = useAppStore((s) => s.selectedDeviceId);

  const updateStatus = useCallback(
    (
      id: ConnectionId,
      status: ConnectionStatus,
      error?: string,
      errorKind?: Connection["errorKind"],
    ) => {
      updateSavedConnection(id, {
        status,
        error: error || undefined,
        errorKind: error ? errorKind : undefined,
        ...(status === "disconnected" ? { lastConnectedAt: Date.now() } : {}),
      });
    },
    [updateSavedConnection],
  );

  const teardown = useCallback(async (id: ConnectionId, conn?: Connection) => {
    log.debug("teardown: enter", { id });
    kmpSubscriptions.get(id)?.();
    kmpSubscriptions.delete(id);
    configSubscriptions.get(id)?.();
    configSubscriptions.delete(id);

    if (conn?.meshDeviceId) {
      const device = useDeviceStore.getState().getDevice(conn.meshDeviceId);
      try {
        // Await the underlying transport's close so the port is fully
        // released before the user clicks reconnect — otherwise port.open()
        // can race the close and throw "port already open".
        await device?.connection?.disconnect();
        log.debug("teardown: transport disconnect awaited");
      } catch (e) {
        const err = e as Error;
        log.warn("teardown: transport disconnect threw", {
          name: err?.name,
          message: err?.message,
        });
      }
    }
    log.debug("teardown: done", { id });
  }, []);

  const removeConnection = useCallback(
    async (id: ConnectionId) => {
      const conn = connections.find((c) => c.id === id);
      await teardown(id, conn);
      heldSerialPorts.delete(id);
      heldBluetoothDevices.delete(id);
      if (conn?.meshDeviceId) {
        try {
          useDeviceStore.getState().removeDevice(conn.meshDeviceId);
        } catch (e) {
          const err = e as Error;
          log.error("removeConnection: removeDevice threw", {
            id,
            meshDeviceId: conn.meshDeviceId,
            name: err?.name,
            message: err?.message,
          });
        }
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
      transport: Transport,
      { sdkOwnsConnection = false }: { sdkOwnsConnection?: boolean } = {},
    ): Promise<number> => {
      // Reuse existing meshDeviceId if the device entry still exists; otherwise mint a new one.
      const conn = connections.find((c) => c.id === id);
      let deviceId = conn?.meshDeviceId;
      if (deviceId && !useDeviceStore.getState().getDevice(deviceId)) {
        deviceId = undefined;
      }
      deviceId = deviceId ?? randId();

      const device = addDevice(deviceId);

      // Flip status to "configuring" up front. buildMeshDevice awaits the
      // OPFS DB open which can take a beat (or stall under multi-tab
      // contention); we don't want the UI looking stuck at "connecting"
      // while persistence is spinning up.
      updateStatus(id, "configuring");
      log.debug("setupMeshDevice: building MeshDevice", { id, deviceId });

      // Read the node number from the live store: the `connections` closure
      // can predate the last handshake's update.
      const nodeNum = useDeviceStore
        .getState()
        .savedConnections.find((c) => c.id === id)?.nodeNum;
      const { meshDevice, persistent } = await buildMeshDevice(
        id,
        deviceId,
        transport,
        nodeNum,
        { heartbeat: !sdkOwnsConnection },
      );
      log.debug("setupMeshDevice: MeshDevice built", { id, persistent });
      if (!persistent) {
        toast({
          title: t("toasts.storageUnavailable", { ns: "connections" }),
          description: t("toasts.storageUnavailableDescription", {
            ns: "connections",
          }),
        });
      }

      // Replace any client left from an earlier attempt, so the app reads
      // this session's state rather than the dead one's.
      if (meshRegistry.has(id)) meshRegistry.unregister(id);
      meshRegistry.register(id, meshDevice.meshClient);
      meshRegistry.setActive(id);
      // Created now so it sees the handshake's config, not on first render.
      editorFor(meshDevice.meshClient);

      setSelectedDevice(deviceId);
      device.addConnection(meshDevice);
      subscribeAll(device, meshDevice);

      setActiveConnectionId(id);
      device.setConnectionId(id);

      // MeshClient flips device.status to DeviceConfigured once both
      // handshake stages (config, then NodeDB) are done, and starts its own
      // heartbeat. onConfigComplete also fires after the config stage, so it
      // can't be used here. `markConfigured` is idempotent.
      let configuredHandled = false;
      const markConfigured = (source: string): void => {
        if (configuredHandled) return;
        configuredHandled = true;
        log.info("connect transitioned to configured", { id, source });
        updateStatus(id, "configured");
        const client = meshDevice.meshClient;
        if (client.device.firmwareSupport.value === "shouldUpdate") {
          toast({
            title: t("toasts.firmwareOutdated", { ns: "connections" }),
            description: t("toasts.firmwareOutdatedDescription", {
              ns: "connections",
              version: client.device.metadata.value?.firmwareVersion,
              minimum: MIN_FIRMWARE_VERSION,
            }),
          });
        }
      };

      const unsubStatusSignal = meshDevice.meshClient.device.status.subscribe(
        (s) => {
          if (s === DeviceStatusEnum.DeviceConfigured)
            markConfigured("device.status");
          // The Kotlin SDK reconnected the transport; the next handshake
          // must be able to mark the connection configured again.
          if (s === DeviceStatusEnum.DeviceReconnecting)
            configuredHandled = false;
        },
      );
      // Catch-up: signal subscribe doesn't fire for the current value, so
      // check synchronously if the device is already past the gate.
      if (
        meshDevice.meshClient.device.status.value ===
        DeviceStatusEnum.DeviceConfigured
      ) {
        markConfigured("initial-check");
      }

      // Reboot: firmware emits `rebooted` after a soft reset (config write,
      // OTA, manual reboot). The SDK re-runs the handshake, but the
      // saved-connection status is already "configured" — so the overlay
      // would stay hidden. Flip status back to "configuring" and reset
      // `configuredHandled` so the next DeviceConfigured re-marks.
      const unsubRebooted = meshDevice.events.onRebooted.subscribe(() => {
        log.info("device rebooted — re-entering configuring", { id });
        configuredHandled = false;
        updateStatus(id, "configuring");
      });

      // History is stored per radio. The SDK switches this session to the
      // node my_info names; saving it on the connection lets the next connect
      // open that node's history straight away.
      const unsubMyNodeInfo = meshDevice.events.onMyNodeInfo.subscribe(
        ({ myNodeNum }) => {
          if (myNodeNum <= 0) return;
          const saved = useDeviceStore
            .getState()
            .savedConnections.find((c) => c.id === id);
          if (saved && saved.nodeNum !== myNodeNum) {
            updateSavedConnection(id, { nodeNum: myNodeNum });
          }
        },
      );

      configSubscriptions.set(id, () => {
        unsubStatusSignal();
        unsubRebooted();
        unsubMyNodeInfo();
      });

      log.debug("setupMeshDevice: calling configure()", { id });
      meshDevice
        .configure()
        .then(() => {
          log.debug("setupMeshDevice: configure() resolved", { id });
        })
        .catch((error) => {
          const e = error as Error;
          log.error("setupMeshDevice: configure() rejected", {
            id,
            name: e?.name,
            message: e?.message,
          });
          updateStatus(
            id,
            "error",
            error instanceof FirmwareTooOldError
              ? t("errors.firmwareTooOld", {
                  ns: "connections",
                  version: error.firmwareVersion,
                  minimum: MIN_FIRMWARE_VERSION,
                })
              : (error?.message ?? String(error)),
          );
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

  /**
   * Connects through the Kotlin SDK, which owns the transport, the
   * handshake and reconnects. The existing MeshDevice is fed from the SDK's
   * frames so the rest of the app is unchanged.
   */
  const connectThroughKmp = useCallback(
    async (id: ConnectionId, makeClient: () => Promise<MeshtasticClient>) => {
      const client = await makeClient();
      let reconnecting = false;
      kmpSubscriptions.get(id)?.();
      kmpSubscriptions.set(
        id,
        client.onConnectionState((state) => {
          const saved = useDeviceStore
            .getState()
            .savedConnections.find((c) => c.id === id);
          if (!saved) return;
          const reconnect = reconnectAttempt(state);
          if (reconnect) {
            reconnecting = true;
            log.warn("kmp: reconnecting", { id, ...reconnect });
            updateSavedConnection(id, {
              status: "connecting",
              reconnect,
              error: undefined,
              errorKind: undefined,
            });
            return;
          }
          if (!reconnecting) return;
          if (state.kind === "connected") {
            reconnecting = false;
            log.info("kmp: reconnected, re-running the handshake", { id });
            updateSavedConnection(id, {
              status: "configuring",
              reconnect: undefined,
            });
            const device = saved.meshDeviceId
              ? useDeviceStore.getState().getDevice(saved.meshDeviceId)
              : undefined;
            device?.connection?.configure().catch((error: unknown) => {
              updateSavedConnection(id, connectFailure(error));
            });
          } else if (state.kind === "disconnected") {
            reconnecting = false;
            log.error("kmp: reconnect attempts exhausted", { id });
            updateSavedConnection(id, {
              status: "error",
              reconnect: undefined,
              error: t("connections:errors.reconnectFailed", {
                attempts: state.maxAttempts,
              }),
              errorKind: "network",
            });
          } else {
            updateSavedConnection(id, { status: toConnectionStatus(state) });
          }
        }),
      );
      try {
        await client.connect();
        await setupMeshDevice(id, kmpTransport(client), {
          sdkOwnsConnection: true,
        });
        return true;
      } catch (error) {
        log.error("kmp: connect failed", {
          id,
          name: error instanceof Error ? error.name : undefined,
          message: error instanceof Error ? error.message : String(error),
        });
        kmpSubscriptions.get(id)?.();
        kmpSubscriptions.delete(id);
        updateSavedConnection(id, connectFailure(error));
        return false;
      }
    },
    [setupMeshDevice, updateSavedConnection],
  );

  const connect = useCallback(
    async (id: ConnectionId, opts?: { allowPrompt?: boolean }) => {
      // Read from the live store, not the memoized `connections` closure: callers
      // such as addConnectionAndConnect() add a connection and connect to it in the
      // same tick, before this hook re-renders, so the closure would be stale.
      const conn = useDeviceStore
        .getState()
        .savedConnections.find((c) => c.id === id);
      if (!conn) {
        log.warn("connect: unknown connection id", { id });
        return false;
      }
      if (conn.status === "configured" || conn.status === "connected") {
        log.debug("connect: already connected", { id, status: conn.status });
        return true;
      }

      log.info("connect: enter", {
        id,
        type: conn.type,
        allowPrompt: !!opts?.allowPrompt,
      });
      updateStatus(id, "connecting");
      const allowPrompt = opts?.allowPrompt ?? false;
      try {
        switch (conn.type) {
          case "http":
            return await connectThroughKmp(id, () =>
              createHttpClient(conn.url, allowPrompt),
            );
          case "serial": {
            const target = await serialTarget(conn, allowPrompt);
            return await connectThroughKmp(id, () =>
              createSerialClient(target),
            );
          }
          case "bluetooth": {
            const target = await bluetoothTarget(conn, allowPrompt);
            return await connectThroughKmp(id, () =>
              createBluetoothClient(target),
            );
          }
        }
      } catch (error) {
        log.error("connect: no device to connect to", {
          id,
          name: error instanceof Error ? error.name : undefined,
          message: error instanceof Error ? error.message : String(error),
        });
        updateSavedConnection(id, connectFailure(error));
        return false;
      }
    },
    [updateStatus, updateSavedConnection, connectThroughKmp],
  );

  const disconnect = useCallback(
    async (id: ConnectionId) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) return;
      try {
        await teardown(id, conn);
        if (conn.meshDeviceId) {
          useDeviceStore
            .getState()
            .getDevice(conn.meshDeviceId)
            ?.setConnectionId(null);
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
    async (input: NewConnection, handle?: ConnectionHandle) => {
      const conn = addConnection(input);
      if (handle?.bluetoothDevice && conn.type === "bluetooth") {
        heldBluetoothDevices.set(conn.id, handle.bluetoothDevice);
      }
      if (handle?.serialPort && conn.type === "serial") {
        heldSerialPorts.set(conn.id, handle.serialPort);
      }
      await connect(conn.id, { allowPrompt: true });
      return conn;
    },
    [addConnection, connect],
  );

  const refreshStatuses = useCallback(async () => {
    const candidates = connections.filter(
      (c) =>
        c.status !== "connected" &&
        c.status !== "configured" &&
        c.status !== "configuring",
    );
    await Promise.all(
      candidates.map(async (c) => {
        const { status, error, errorKind } = await probeConnection(c);
        updateSavedConnection(c.id, { status, error, errorKind });
      }),
    );
  }, [connections, updateSavedConnection]);

  const syncConnectionStatuses = useCallback(() => {
    const activeConnection = connections.find(
      (c) => c.meshDeviceId === selectedDeviceId,
    );
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
