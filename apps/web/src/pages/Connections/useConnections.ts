import {
  type BluetoothConnection,
  type ConnectionHandle,
  pickBluetoothDevice,
  pickSerialPort,
  probeConnection,
  type SerialConnection,
} from "@app/core/connections/browserDevices.ts";
import {
  openRepositories,
  UNKNOWN_NODE_SCOPE,
} from "@app/core/connections/repositories.ts";
import type {
  Connection,
  ConnectionId,
  ConnectionStatus,
  NewConnection,
} from "@app/core/stores/deviceStore/types";
import { createConnectionFromInput } from "@app/pages/Connections/utils";
import { toast } from "@core/hooks/useToast.ts";
import {
  type BluetoothTarget,
  type ConnectionStateJs,
  createBluetoothClient,
  createHttpClient,
  createSerialClient,
  type MeshtasticClient,
  type SerialTarget,
  type StorageJs,
} from "@core/kmp/client.ts";
import { editorFor } from "@core/kmp/configEditorIo.ts";
import {
  connectFailure,
  reconnectAttempt,
  toConnectionStatus,
} from "@core/kmp/connectionState.ts";
import { meshRegistry } from "@core/kmp/registry.ts";
import { MeshSession } from "@core/kmp/session.ts";
import { createLogger } from "@core/log.ts";
import { useAppStore, useDeviceStore } from "@core/stores";
import { subscribeAll } from "@core/subscriptions.ts";
import { MIN_FIRMWARE_VERSION } from "@core/utils/firmware.ts";
import { randId } from "@core/utils/randId.ts";
import { t } from "i18next";
import { useCallback } from "react";

const log = createLogger("useConnections");

// Per-connection out-of-band handles tracked outside Zustand:
//   - heldSerialPorts / heldBluetoothDevices: the port or device the user
//     picked, so later connects reuse it without prompting.
//   - sessionTeardowns: the session's subscriptions, released on teardown.
const heldSerialPorts = new Map<ConnectionId, SerialPort>();
const heldBluetoothDevices = new Map<ConnectionId, BluetoothDevice>();
const sessionTeardowns = new Map<ConnectionId, () => void>();

/**
 * What the SDK opens for a serial connection. Automatic connects pass only
 * the saved USB ids and the SDK reopens the permitted port itself; a click
 * (`allowPrompt`) without a held port shows the picker, filtered to the
 * saved ids, straight away so the gesture is still live, and hands the
 * chosen port over.
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
  const port = await pickSerialPort(conn);
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
  const device = await pickBluetoothDevice();
  heldBluetoothDevices.set(conn.id, device);
  if (device.id !== conn.deviceId) {
    useDeviceStore.getState().updateSavedConnection(conn.id, {
      deviceId: device.id,
      deviceName: device.name,
    });
  }
  return { device, deviceId: device.id };
}

const savedConnection = (id: ConnectionId): Connection | undefined =>
  useDeviceStore.getState().savedConnections.find((c) => c.id === id);

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

  const teardown = useCallback(async (id: ConnectionId) => {
    log.debug("teardown: enter", { id });
    sessionTeardowns.get(id)?.();
    sessionTeardowns.delete(id);
    try {
      await meshRegistry.get(id)?.disconnect();
    } catch (e) {
      log.warn("teardown: disconnect threw", {
        name: e instanceof Error ? e.name : undefined,
        message: e instanceof Error ? e.message : String(e),
      });
    }
    log.debug("teardown: done", { id });
  }, []);

  const removeConnection = useCallback(
    async (id: ConnectionId) => {
      const conn = connections.find((c) => c.id === id);
      await teardown(id);
      heldSerialPorts.delete(id);
      heldBluetoothDevices.delete(id);
      if (conn?.meshDeviceId) {
        try {
          useDeviceStore.getState().removeDevice(conn.meshDeviceId);
        } catch (e) {
          log.error("removeConnection: removeDevice threw", {
            id,
            meshDeviceId: conn.meshDeviceId,
            message: e instanceof Error ? e.message : String(e),
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

  /**
   * Connects through the Kotlin SDK, which owns the transport, the
   * handshake and reconnects. A session over the client decodes what the
   * SDK delivers into the app's stores, with history opened for the node
   * this connection reached last time.
   */
  const connectThroughKmp = useCallback(
    async (
      id: ConnectionId,
      makeClient: (storage?: StorageJs) => Promise<MeshtasticClient>,
    ) => {
      const conn = savedConnection(id);
      const { options, persistent, sdkStorage } = await openRepositories(
        conn?.nodeNum,
      );
      const client = await makeClient(sdkStorage);
      let deviceId = conn?.meshDeviceId;
      if (deviceId && !useDeviceStore.getState().getDevice(deviceId)) {
        deviceId = undefined;
      }
      deviceId = deviceId ?? randId();
      const device = addDevice(deviceId);

      if (!persistent) {
        toast({
          title: t("toasts.storageUnavailable", { ns: "connections" }),
          description: t("toasts.storageUnavailableDescription", {
            ns: "connections",
          }),
        });
      }
      let scope = conn?.nodeNum ?? UNKNOWN_NODE_SCOPE;
      const session = new MeshSession(client, options);

      // Replace any session left from an earlier attempt, so the app reads
      // this session's state rather than the dead one's, and its client
      // releases the port before this one opens it.
      await teardown(id);
      meshRegistry.unregister(id);
      meshRegistry.register(id, session);
      meshRegistry.setActive(id);
      // Created now so it sees the handshake's config, not on first render.
      editorFor(session);
      setSelectedDevice(deviceId);
      const unsubscribeStore = subscribeAll(device, session);
      setActiveConnectionId(id);
      device.setConnectionId(id);
      updateSavedConnection(id, { meshDeviceId: deviceId });

      let reconnecting: ConnectionStateJs | undefined;
      let firmwareChecked = false;
      const unsubscribes = [
        unsubscribeStore,
        session.events.onConnectionState.subscribe((state) => {
          if (!savedConnection(id)) return;
          const reconnect = reconnectAttempt(state);
          if (
            reconnect &&
            (state.errorKind === "lna-denied" ||
              state.errorKind === "lna-prompt")
          ) {
            log.warn("kmp: local network access lost", { id, ...reconnect });
            void teardown(id);
            const cause = new Error(state.error ?? "");
            cause.name = state.errorKind;
            updateSavedConnection(id, {
              ...connectFailure(cause),
              reconnect: undefined,
            });
            return;
          }
          if (reconnect) {
            reconnecting = state;
            log.warn("kmp: reconnecting", { id, ...reconnect });
            updateSavedConnection(id, {
              status: "connecting",
              reconnect,
              error: undefined,
              errorKind: undefined,
            });
            return;
          }
          if (state.kind === "disconnected") {
            if (!reconnecting) return;
            const last = reconnecting;
            reconnecting = undefined;
            // The SDK gives up before its first attempt on a drop it
            // cannot retry; that cause is the error, not the attempt cap.
            if (last.attempt === 1 && last.error) {
              log.error("kmp: dropped without retrying", {
                id,
                errorKind: last.errorKind,
              });
              const cause = new Error(last.error);
              cause.name = last.errorKind ?? "transport";
              updateSavedConnection(id, {
                ...connectFailure(cause),
                reconnect: undefined,
              });
              return;
            }
            log.error("kmp: reconnect attempts exhausted", { id });
            updateSavedConnection(id, {
              status: "error",
              reconnect: undefined,
              error: t("connections:errors.reconnectFailed", {
                attempts: state.maxAttempts,
              }),
              errorKind: "network",
            });
            return;
          }
          reconnecting = undefined;
          updateSavedConnection(id, {
            status: toConnectionStatus(state),
            reconnect: undefined,
          });
          if (state.kind === "connected") {
            if (firmwareChecked) return;
            firmwareChecked = true;
            if (session.device.firmwareSupport.peek() === "shouldUpdate") {
              toast({
                title: t("toasts.firmwareOutdated", { ns: "connections" }),
                description: t("toasts.firmwareOutdatedDescription", {
                  ns: "connections",
                  version: session.device.metadata.peek()?.firmwareVersion,
                  minimum: MIN_FIRMWARE_VERSION,
                }),
              });
            }
          } else {
            firmwareChecked = false;
          }
        }),
        // History is stored per radio. Saving the node on the connection lets
        // the next connect open that node's history straight away.
        session.events.onMyNodeInfo.subscribe(({ myNodeNum }) => {
          if (myNodeNum <= 0) return;
          if (savedConnection(id)?.nodeNum !== myNodeNum) {
            updateSavedConnection(id, { nodeNum: myNodeNum });
          }
          if (scope !== myNodeNum) {
            scope = myNodeNum;
            session.rescope(myNodeNum);
          }
        }),
        // Firmware emits `rebooted` after a soft reset; the SDK reconnects
        // and runs the handshake again, so the overlay should show again.
        session.events.onRebooted.subscribe(() => {
          log.info("device rebooted, re-entering configuring", { id });
          updateStatus(id, "configuring");
        }),
      ];
      sessionTeardowns.set(id, () => {
        for (const off of unsubscribes) off();
        session.close();
      });

      try {
        await client.connect();
        return true;
      } catch (error) {
        log.error("kmp: connect failed", {
          id,
          name: error instanceof Error ? error.name : undefined,
          message: error instanceof Error ? error.message : String(error),
        });
        sessionTeardowns.get(id)?.();
        sessionTeardowns.delete(id);
        updateSavedConnection(id, connectFailure(error));
        return false;
      }
    },
    [
      addDevice,
      setSelectedDevice,
      setActiveConnectionId,
      teardown,
      updateSavedConnection,
      updateStatus,
    ],
  );

  const connect = useCallback(
    async (id: ConnectionId, opts?: { allowPrompt?: boolean }) => {
      // Read from the live store, not the memoized `connections` closure:
      // addConnectionAndConnect() adds a connection and connects to it in
      // the same tick, before this hook re-renders.
      const conn = savedConnection(id);
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
      // The app follows one radio at a time: a session still live on
      // another connection would keep its port and poller to itself.
      for (const other of [...sessionTeardowns.keys()]) {
        if (other === id) continue;
        await teardown(other);
        const otherDevice = savedConnection(other)?.meshDeviceId;
        if (otherDevice) {
          useDeviceStore
            .getState()
            .getDevice(otherDevice)
            ?.setConnectionId(null);
        }
        updateSavedConnection(other, {
          status: "disconnected",
          error: undefined,
        });
      }
      const allowPrompt = opts?.allowPrompt ?? false;
      try {
        switch (conn.type) {
          case "http":
            return await connectThroughKmp(id, (storage) =>
              createHttpClient(conn.url, allowPrompt, storage),
            );
          case "serial": {
            const target = await serialTarget(conn, allowPrompt);
            return await connectThroughKmp(id, (storage) =>
              createSerialClient(target, storage),
            );
          }
          case "bluetooth": {
            const target = await bluetoothTarget(conn, allowPrompt);
            return await connectThroughKmp(id, (storage) =>
              createBluetoothClient(target, storage),
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
    [updateStatus, updateSavedConnection, connectThroughKmp, teardown],
  );

  const disconnect = useCallback(
    async (id: ConnectionId) => {
      const conn = connections.find((c) => c.id === id);
      if (!conn) return;
      try {
        await teardown(id);
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
