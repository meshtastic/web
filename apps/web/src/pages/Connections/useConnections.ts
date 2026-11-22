import {
  type BluetoothConnection,
  type ConnectionHandle,
  pickBluetoothDevice,
  pickSerialPort,
  probeConnection,
  type SerialConnection,
} from "@app/core/connections/browserDevices.ts";
import { openRepositories } from "@app/core/connections/repositories.ts";
import {
  nextConnectionPatch,
  ownRadioName,
  supersededAttempts,
} from "@app/core/connections/status.ts";
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
  type SdkStorage,
} from "@core/kmp/client.ts";
import { editorFor } from "@core/kmp/configEditorIo.ts";
import {
  connectFailure,
  reconnectAttempt,
  toConnectionStatus,
} from "@core/kmp/connectionState.ts";
import { resetSdkStorage } from "@core/kmp/browserStorage.ts";
import { meshRegistry } from "@core/kmp/registry.ts";
import { MeshSession } from "@core/kmp/session.ts";
import { createLogger } from "@core/log.ts";
import { closeStorageDb } from "@core/sdkStorage.ts";
import { useAppStore, useDeviceStore } from "@core/stores";
import { subscribeAll } from "@core/subscriptions.ts";
import { MIN_FIRMWARE_VERSION } from "@core/utils/firmware.ts";
import { randId } from "@core/utils/randId.ts";
import { Result } from "better-result";
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

type ClientFactory = (storage?: SdkStorage) => Promise<MeshtasticClient>;

async function clientFactory(
  conn: Connection,
  allowPrompt: boolean,
): Promise<ClientFactory> {
  switch (conn.type) {
    case "http":
      return (storage) => createHttpClient(conn.url, allowPrompt, storage);
    case "serial": {
      const target = await serialTarget(conn, allowPrompt);
      return (storage) => createSerialClient(target, storage);
    }
    case "bluetooth": {
      const target = await bluetoothTarget(conn, allowPrompt);
      return (storage) => createBluetoothClient(target, storage);
    }
  }
}

const savedConnection = (id: ConnectionId): Connection | undefined =>
  useDeviceStore.getState().savedConnections.find((c) => c.id === id);

/**
 * Writes a status change, with the fields that follow from it: when the
 * radio was last reached, and the end of a pending attempt.
 */
function patchConnection(
  id: ConnectionId,
  fields: Partial<Connection> & Pick<Connection, "status">,
): void {
  const prev = savedConnection(id)?.status;
  useDeviceStore.getState().updateSavedConnection(id, {
    ...fields,
    ...nextConnectionPatch(prev, fields.status, Date.now()),
  });
}

function abandonConnect(id: ConnectionId): false {
  log.info("connect: abandoned, the app was handed to another tab", { id });
  patchConnection(id, { status: "disconnected", error: undefined });
  return false;
}

async function teardownSession(id: ConnectionId): Promise<void> {
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
}

async function disconnectConnection(id: ConnectionId): Promise<void> {
  const conn = savedConnection(id);
  if (!conn) return;
  // A connect still in flight (stuck opening the port, say) must not
  // bring the connection back after the user cancelled it.
  endAttempts(id);
  try {
    await teardownSession(id);
    if (conn.meshDeviceId) {
      useDeviceStore
        .getState()
        .getDevice(conn.meshDeviceId)
        ?.setConnectionId(null);
    }
  } finally {
    patchConnection(id, { status: "disconnected", error: undefined });
  }
}

/** Forgets a saved connection: its session, held port and device data. */
async function forgetConnection(id: ConnectionId): Promise<void> {
  const conn = savedConnection(id);
  await teardownSession(id);
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
  useDeviceStore.getState().removeSavedConnection(id);
}

/**
 * Once `id` reaches its radio, drops the other entries for the same radio
 * that never reached one (see supersededAttempts).
 */
function dropSupersededAttempts(id: ConnectionId): void {
  const reached = savedConnection(id);
  if (!reached) return;
  const { savedConnections } = useDeviceStore.getState();
  for (const other of supersededAttempts(savedConnections, reached)) {
    log.info("connect: dropping an unfinished attempt at the same radio", {
      id,
      other,
    });
    void forgetConnection(other);
  }
}

/** Disconnects every live session, as the drawer's Disconnect does. */
// Bumped when the app is handed to another tab, so a connect still in
// flight here stops before it opens the port or registers a session.
let handovers = 0;
const handedOver = (seen: number): boolean => seen !== handovers;

/**
 * How long a serial or Bluetooth connect may sit in "connecting" once the
 * port or device is chosen. Opening a port normally takes well under a
 * second; past this the browser call is stuck (seen after a reload while
 * the old page still held the port) and nothing would ever end it.
 * HTTP is left out: its connect can wait on a Local Network Access prompt.
 * The handshake after the port opens has the SDK's own timeout.
 */
export const OPEN_TIMEOUT_MS = 20_000;

/** One connect attempt; a newer attempt, a cancel or a timeout ends it. */
interface Attempt {
  readonly id: ConnectionId;
  readonly generation: number;
  readonly seen: number;
}
const attemptGenerations = new Map<ConnectionId, number>();
// Settles the pending connect() of the attempt in flight, if any, so a
// caller awaiting a stuck connect gets its answer when the attempt ends.
const attemptSettlers = new Map<ConnectionId, () => void>();

function endAttempts(id: ConnectionId): number {
  const next = (attemptGenerations.get(id) ?? 0) + 1;
  attemptGenerations.set(id, next);
  const settle = attemptSettlers.get(id);
  attemptSettlers.delete(id);
  settle?.();
  return next;
}

const beginAttempt = (id: ConnectionId): Attempt => ({
  id,
  generation: endAttempts(id),
  seen: handovers,
});

const isCurrent = (attempt: Attempt): boolean =>
  !handedOver(attempt.seen) &&
  attemptGenerations.get(attempt.id) === attempt.generation;

/**
 * Stops an attempt that was ended while it awaited. A handover resets the
 * status here; a cancel or timeout already wrote the status it wanted.
 */
function abandonAttempt(attempt: Attempt): false {
  if (handedOver(attempt.seen)) return abandonConnect(attempt.id);
  log.info("connect: attempt ended while in flight", { id: attempt.id });
  return false;
}

export async function disconnectAllConnections(): Promise<void> {
  handovers += 1;
  for (const id of [...sessionTeardowns.keys()]) {
    await disconnectConnection(id);
  }
  resetSdkStorage();
  await closeStorageDb();
}

export function useConnections() {
  const connections = useDeviceStore((s) => s.savedConnections);
  const addSavedConnection = useDeviceStore((s) => s.addSavedConnection);
  const updateSavedConnection = useDeviceStore((s) => s.updateSavedConnection);
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
      patchConnection(id, {
        status,
        error: error || undefined,
        errorKind: error ? errorKind : undefined,
      });
    },
    [],
  );

  const teardown = teardownSession;

  const removeConnection = forgetConnection;

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
   * SDK delivers into the app's stores. History is the radio's, whichever
   * transport reached it: it opens once the handshake names the radio, and
   * what arrived before that is filed under it then (see `RadioStorage`).
   */
  const connectThroughKmp = useCallback(
    async (attempt: Attempt, makeClient: ClientFactory) => {
      const { id } = attempt;
      const conn = savedConnection(id);
      const { options, persistent, sdkStorage, radio } =
        await openRepositories();
      if (!isCurrent(attempt)) return abandonAttempt(attempt);
      log.info("connect: storage ready", { id, persistent });
      const client = await makeClient(sdkStorage);
      if (!isCurrent(attempt)) return abandonAttempt(attempt);
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
      const session = new MeshSession(client, options);
      // The radio this session's history is filed under, once named.
      let identified: number | undefined;
      const identify = (nodeNum: number | undefined) => {
        if (nodeNum === undefined || nodeNum <= 0) return;
        if (savedConnection(id)?.nodeNum !== nodeNum) {
          updateSavedConnection(id, { nodeNum });
        }
        if (identified === nodeNum) return;
        identified = nodeNum;
        // Adopting switches every repository at once, and their later
        // calls wait for it, so the reload below sees the adopted rows.
        void radio?.identify(nodeNum).then((adopted) => {
          if (Result.isError(adopted)) {
            log.warn("connect: history before the handshake was not kept", {
              id,
              message: adopted.error.message,
            });
          }
        });
        session.rescope(nodeNum);
      };

      // Replace any session left from an earlier attempt, so the app reads
      // this session's state rather than the dead one's, and its client
      // releases the port before this one opens it.
      await teardown(id);
      if (!isCurrent(attempt)) {
        session.close();
        return abandonAttempt(attempt);
      }
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
            patchConnection(id, {
              ...connectFailure(cause),
              reconnect: undefined,
            });
            return;
          }
          if (reconnect) {
            reconnecting = state;
            log.warn("kmp: reconnecting", { id, ...reconnect });
            patchConnection(id, {
              status: "connecting",
              reconnect,
              error: undefined,
              errorKind: undefined,
            });
            return;
          }
          if (state.kind === "disconnected") {
            if (!reconnecting) {
              if (session.isRehandshaking) return;
              log.error("kmp: dropped without retrying", { id });
              patchConnection(id, {
                status: "error",
                reconnect: undefined,
                error: t("connections:errors.connectionLost"),
                errorKind: "network",
              });
              return;
            }
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
              patchConnection(id, {
                ...connectFailure(cause),
                reconnect: undefined,
              });
              return;
            }
            log.error("kmp: reconnect attempts exhausted", { id });
            patchConnection(id, {
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
          patchConnection(id, {
            status: toConnectionStatus(state),
            reconnect: undefined,
          });
          if (state.kind === "connected") {
            dropSupersededAttempts(id);
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
        // History is stored per radio. The node number usually comes in
        // my_info; the SDK's own copy covers a my_info the web can't decode.
        session.events.onMyNodeInfo.subscribe(({ myNodeNum }) =>
          identify(myNodeNum),
        ),
        session.device.myNodeNum.subscribe(identify),
        // Remember the radio's own name, so a reconnect can say which radio.
        session.nodes.list.subscribe((nodes) => {
          if (identified === undefined) return;
          const radioName = ownRadioName(nodes, identified);
          if (radioName && savedConnection(id)?.radioName !== radioName) {
            updateSavedConnection(id, { radioName });
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
        if (identified === undefined) void radio?.discard();
      });

      try {
        log.info("connect: opening transport", { id });
        await client.connect();
        // Ended meanwhile: whoever ended it tore the session down.
        return isCurrent(attempt);
      } catch (error) {
        if (!isCurrent(attempt)) return abandonAttempt(attempt);
        log.error("kmp: connect failed", {
          id,
          name: error instanceof Error ? error.name : undefined,
          message: error instanceof Error ? error.message : String(error),
        });
        sessionTeardowns.get(id)?.();
        sessionTeardowns.delete(id);
        meshRegistry.unregister(id);
        if (
          error instanceof Error &&
          (error.name === "serial-unavailable" ||
            error.name === "bluetooth-unavailable")
        ) {
          heldSerialPorts.delete(id);
          heldBluetoothDevices.delete(id);
        }
        patchConnection(id, connectFailure(error));
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

  const connectAttempt = useCallback(
    async (
      attempt: Attempt,
      conn: Connection,
      allowPrompt: boolean,
      watch: () => void,
    ): Promise<boolean> => {
      const { id } = attempt;
      try {
        // The picker runs first, while the click's activation is still live.
        const makeClient = await clientFactory(conn, allowPrompt);
        if (!isCurrent(attempt)) return abandonAttempt(attempt);
        watch();
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
          patchConnection(other, {
            status: "disconnected",
            error: undefined,
          });
        }
        return await connectThroughKmp(attempt, makeClient);
      } catch (error) {
        if (!isCurrent(attempt)) return abandonAttempt(attempt);
        log.error("connect: no device to connect to", {
          id,
          name: error instanceof Error ? error.name : undefined,
          message: error instanceof Error ? error.message : String(error),
        });
        patchConnection(id, connectFailure(error));
        return false;
      }
    },
    [connectThroughKmp, teardown],
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
      if (conn.status === "connecting" && sessionTeardowns.has(id)) {
        log.debug("connect: already connecting", { id, ...conn.reconnect });
        return true;
      }

      log.info("connect: enter", {
        id,
        type: conn.type,
        allowPrompt: !!opts?.allowPrompt,
      });
      updateStatus(id, "connecting");
      const allowPrompt = opts?.allowPrompt ?? false;
      const attempt = beginAttempt(id);
      let timer: ReturnType<typeof setTimeout> | undefined;
      let settle: () => void = () => {};
      const ended = new Promise<false>((resolve) => {
        settle = () => resolve(false);
      });
      attemptSettlers.set(id, settle);
      // Ends an attempt stuck opening the port: nothing else would, and
      // the overlay would spin forever.
      const watch = () => {
        if (conn.type === "http") return;
        timer = setTimeout(() => {
          const now = savedConnection(id);
          if (!isCurrent(attempt) || now?.status !== "connecting") return;
          if (now.reconnect) return;
          log.error("connect: timed out opening the transport", {
            id,
            ms: OPEN_TIMEOUT_MS,
          });
          endAttempts(id);
          void teardown(id);
          sessionTeardowns.delete(id);
          meshRegistry.unregister(id);
          heldSerialPorts.delete(id);
          heldBluetoothDevices.delete(id);
          patchConnection(id, {
            status: "error",
            error: t("connections:errors.openTimeout"),
            errorKind: "network",
          });
        }, OPEN_TIMEOUT_MS);
      };
      const work = connectAttempt(attempt, conn, allowPrompt, watch);
      try {
        return await Promise.race([work, ended]);
      } finally {
        clearTimeout(timer);
        if (attemptSettlers.get(id) === settle) attemptSettlers.delete(id);
      }
    },
    [updateStatus, teardown, connectAttempt],
  );

  const disconnect = disconnectConnection;

  const addConnection = useCallback(
    (input: NewConnection) => {
      const conn = createConnectionFromInput(input);
      addSavedConnection(conn);
      return conn;
    },
    [addSavedConnection],
  );

  /**
   * Saves a connection and connects to it. The entry is saved first, since
   * the connect needs it, and stays `pending` until it reaches a radio; one
   * still pending at the next startup is dropped. `keep` ends the pending
   * state once the connect returns, success or not, for an explicit save
   * whose entry the user expects to stay even if the radio didn't answer.
   */
  const addConnectionAndConnect = useCallback(
    async (
      input: NewConnection,
      handle?: ConnectionHandle,
      opts?: { keep?: boolean },
    ) => {
      const conn: Connection = {
        ...createConnectionFromInput(input),
        pending: true,
      };
      addSavedConnection(conn);
      if (handle?.bluetoothDevice && conn.type === "bluetooth") {
        heldBluetoothDevices.set(conn.id, handle.bluetoothDevice);
      }
      if (handle?.serialPort && conn.type === "serial") {
        heldSerialPorts.set(conn.id, handle.serialPort);
      }
      await connect(conn.id, { allowPrompt: true });
      if (opts?.keep && savedConnection(conn.id)?.pending) {
        updateSavedConnection(conn.id, { pending: undefined });
      }
      // The saved entry as the attempt left it, so callers see its status;
      // a failed attempt that was not kept is gone, leaving the original.
      return savedConnection(conn.id) ?? conn;
    },
    [addSavedConnection, connect, updateSavedConnection],
  );

  const refreshStatuses = useCallback(async () => {
    const candidates = connections.filter(
      (c) =>
        !sessionTeardowns.has(c.id) &&
        c.status !== "connected" &&
        c.status !== "configured" &&
        c.status !== "configuring",
    );
    await Promise.all(
      candidates.map(async (c) => {
        const { status, error, errorKind, port, device } =
          await probeConnection(c);
        if (port) {
          heldSerialPorts.set(c.id, port);
        }
        if (device) {
          heldBluetoothDevices.set(c.id, device);
        }
        if (status === "disconnected") {
          heldSerialPorts.delete(c.id);
          heldBluetoothDevices.delete(c.id);
        }
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
        patchConnection(conn.id, { status: "disconnected" });
      }
    });
  }, [connections, selectedDeviceId]);

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
