import { useConnections } from "@app/pages/Connections/useConnections.ts";
import {
  MESHTASTIC_BLE_SERVICE,
  pickBluetoothDevice,
  pickSerialPort,
} from "@core/connections/browserDevices.ts";
import type { ConnectMethod } from "@core/onboarding/capabilities.ts";
import { classifyPickerError } from "@core/onboarding/picker.ts";
import { httpConnectionName } from "@core/onboarding/validation.ts";
import type { WizardEvent } from "@core/onboarding/wizard.ts";
import { useDeviceStore } from "@core/stores";
import type {
  Connection,
  ConnectionId,
  NewConnection,
} from "@core/stores/deviceStore/types.ts";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const liveConnection = (id: ConnectionId): Connection | undefined =>
  useDeviceStore.getState().savedConnections.find((c) => c.id === id);

/** A saved entry that never reached a radio and isn't trying any more. */
const isAbandoned = (conn: Connection): boolean =>
  conn.nodeNum === undefined &&
  (conn.status === "error" || conn.status === "disconnected");

export interface WizardConnection {
  /** The connection this wizard is following, if any. */
  readonly connection: Connection | undefined;
  /**
   * Opens the picker (BT/USB) or connects to `httpUrl`. Call straight from
   * a click handler: the picker needs the click's user activation.
   */
  attempt(method: ConnectMethod, httpUrl?: string): Promise<void>;
  /** Stops a connect that hasn't reached the radio and drops its entry. */
  cancel(): Promise<void>;
  /** Drops entries this wizard saved that never reached a radio. */
  discard(): Promise<void>;
}

/**
 * The wizard's side of connecting: runs the browser picker, saves the
 * connection and connects through the existing `useConnections` flow, and
 * reports the outcome as wizard events. Entries the wizard saved that
 * never reached a radio are removed on retry, skip, cancel and unmount;
 * connections saved elsewhere are never touched.
 */
export function useWizardConnection(
  dispatch: (event: WizardEvent) => void,
): WizardConnection {
  const { t } = useTranslation("onboarding");
  const { addConnectionAndConnect, removeConnection, disconnect } =
    useConnections();
  const [attemptId, setAttemptId] = useState<ConnectionId>();
  const created = useRef(new Set<ConnectionId>());
  const activeId = useDeviceStore((s) => s.activeConnectionId);
  const trackedId = attemptId ?? activeId ?? undefined;
  const connection = useDeviceStore((s) =>
    trackedId === undefined
      ? undefined
      : s.savedConnections.find((c) => c.id === trackedId),
  );

  const removeRef = useRef(removeConnection);
  useEffect(() => {
    removeRef.current = removeConnection;
  }, [removeConnection]);

  const discard = useCallback(async () => {
    for (const id of [...created.current]) {
      const conn = liveConnection(id);
      if (conn !== undefined && !isAbandoned(conn)) continue;
      created.current.delete(id);
      setAttemptId((current) => (current === id ? undefined : current));
      if (conn !== undefined) await removeRef.current(id);
    }
  }, []);

  // Leaving the wizard cleans up after it too.
  useEffect(
    () => () => {
      void discard();
    },
    [discard],
  );

  const cancel = useCallback(async () => {
    if (attemptId !== undefined && created.current.has(attemptId)) {
      await disconnect(attemptId);
    }
    await discard();
  }, [attemptId, disconnect, discard]);

  const save = useCallback(
    async (
      input: NewConnection,
      handle?: Parameters<typeof addConnectionAndConnect>[1],
    ) => {
      await discard();
      const conn = await addConnectionAndConnect(input, handle);
      created.current.add(conn.id);
      setAttemptId(conn.id);
      // Read the outcome from the store, the source of truth for status.
      const after = liveConnection(conn.id);
      if (after?.status === "error") {
        dispatch({ type: "connectFailed", detail: after.error });
      }
    },
    [addConnectionAndConnect, discard, dispatch],
  );

  const attempt = useCallback(
    async (method: ConnectMethod, httpUrl?: string) => {
      try {
        if (method === "bluetooth") {
          // The picker opens first, while the click's activation is live.
          const device = await pickBluetoothDevice();
          dispatch({ type: "devicePicked" });
          await save(
            {
              type: "bluetooth",
              name: device.name ?? t("connect.bluetoothName"),
              deviceId: device.id,
              deviceName: device.name,
              gattServiceUUID: MESHTASTIC_BLE_SERVICE,
            },
            { bluetoothDevice: device },
          );
          return;
        }
        if (method === "serial") {
          const port = await pickSerialPort({
            usbVendorId: undefined,
            usbProductId: undefined,
          });
          dispatch({ type: "devicePicked" });
          const info = port.getInfo();
          await save(
            {
              type: "serial",
              name: t("connect.serialName"),
              usbVendorId: info.usbVendorId,
              usbProductId: info.usbProductId,
            },
            { serialPort: port },
          );
          return;
        }
        if (httpUrl === undefined) return;
        await save({
          type: "http",
          name: httpConnectionName(httpUrl),
          url: httpUrl,
        });
      } catch (error) {
        const failure = classifyPickerError(error);
        dispatch(
          failure.kind === "cancelled"
            ? { type: "pickerCancelled" }
            : { type: "connectFailed", detail: failure.detail },
        );
      }
    },
    [dispatch, save, t],
  );

  return { connection, attempt, cancel, discard };
}
