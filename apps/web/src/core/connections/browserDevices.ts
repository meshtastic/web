import {
  needsLocalNetworkAccess,
  queryLocalNetworkAccess,
} from "@core/connections/lna.ts";
import type { Connection } from "@core/stores/deviceStore/types";
import { httpErrorMessage, testHttpReachable } from "@pages/Connections/utils";

/** The Meshtastic GATT service, the only filter the Bluetooth picker uses. */
export const MESHTASTIC_BLE_SERVICE = "6ba1b218-15a8-461f-9fa8-5dcae273eafd";

export type SerialConnection = Connection & { type: "serial" };
export type BluetoothConnection = Connection & { type: "bluetooth" };

/**
 * A port or device the user picked inside a click handler. The Kotlin SDK
 * never prompts, so these are the only way a new device reaches it.
 */
export interface ConnectionHandle {
  serialPort?: SerialPort;
  bluetoothDevice?: BluetoothDevice;
}

export function serialApi(): Serial | undefined {
  return "serial" in navigator ? navigator.serial : undefined;
}

export function bluetoothApi(): Bluetooth | undefined {
  return "bluetooth" in navigator ? navigator.bluetooth : undefined;
}

export function matchesSavedPort(
  port: SerialPort,
  conn: Pick<SerialConnection, "usbVendorId" | "usbProductId">,
): boolean {
  if (conn.usbVendorId === undefined || conn.usbProductId === undefined) {
    return false;
  }
  const info = port.getInfo();
  return (
    info.usbVendorId === conn.usbVendorId &&
    info.usbProductId === conn.usbProductId
  );
}

/**
 * The one already-permitted port with the saved USB ids, without prompting.
 * Several permitted ports sharing the ids are ambiguous, so none is chosen.
 */
export async function permittedSerialPort(
  conn: SerialConnection,
): Promise<SerialPort | undefined> {
  const serial = serialApi();
  if (!serial) {
    return undefined;
  }
  const matching = (await serial.getPorts()).filter((port) =>
    matchesSavedPort(port, conn),
  );
  return matching.length === 1 ? matching[0] : undefined;
}

/** The port picker, filtered to the saved USB ids. Call inside a click handler. */
export function pickSerialPort(
  conn: Pick<SerialConnection, "usbVendorId" | "usbProductId">,
): Promise<SerialPort> {
  const serial = serialApi();
  if (!serial) {
    return Promise.reject(unsupported("serial"));
  }
  const filters =
    conn.usbVendorId !== undefined && conn.usbProductId !== undefined
      ? [{ usbVendorId: conn.usbVendorId, usbProductId: conn.usbProductId }]
      : [];
  return serial.requestPort({ filters });
}

/** The already-permitted device with the saved id, without prompting. */
export async function knownBluetoothDevice(
  conn: BluetoothConnection,
): Promise<BluetoothDevice | undefined> {
  const bluetooth = bluetoothApi();
  if (
    !bluetooth ||
    !conn.deviceId ||
    typeof bluetooth.getDevices !== "function"
  ) {
    return undefined;
  }
  const known = await bluetooth.getDevices();
  return known.find((device) => device.id === conn.deviceId);
}

/** The device picker, filtered to Meshtastic radios. Call inside a click handler. */
export function pickBluetoothDevice(): Promise<BluetoothDevice> {
  const bluetooth = bluetoothApi();
  if (!bluetooth) {
    return Promise.reject(unsupported("bluetooth"));
  }
  return bluetooth.requestDevice({
    filters: [{ services: [MESHTASTIC_BLE_SERVICE] }],
  });
}

function unsupported(kind: "serial" | "bluetooth"): Error {
  const error = new Error(
    kind === "serial"
      ? "Web Serial is not supported in this browser"
      : "Web Bluetooth is not supported in this browser",
  );
  error.name = `${kind}-unsupported`;
  return error;
}

export type ProbeResult = {
  status: "online" | "configured" | "disconnected" | "error";
  error?: string;
  errorKind?: Connection["errorKind"];
};

/**
 * Probes a saved connection for reachability or permission without opening
 * it, for the saved-connection status badges. A local target whose Local
 * Network Access permission is still `prompt` is left alone: only a click
 * may trigger that prompt.
 */
export async function probeConnection(conn: Connection): Promise<ProbeResult> {
  switch (conn.type) {
    case "http": {
      if (
        needsLocalNetworkAccess(conn.url) &&
        (await queryLocalNetworkAccess()) === "prompt"
      ) {
        return { status: "disconnected" };
      }
      const { reachable, certError } = await testHttpReachable(conn.url);
      if (reachable) {
        return { status: "online" };
      }
      return {
        status: "error",
        error: httpErrorMessage(conn.url, certError),
        errorKind: certError ? "cert" : "network",
      };
    }
    case "bluetooth": {
      try {
        const known = await knownBluetoothDevice(conn);
        return { status: known ? "online" : "disconnected" };
      } catch {
        return { status: "disconnected" };
      }
    }
    case "serial": {
      const serial = serialApi();
      if (!serial) {
        return { status: "disconnected" };
      }
      try {
        const ports = await serial.getPorts();
        const permitted = ports.some((port) => matchesSavedPort(port, conn));
        return { status: permitted ? "online" : "disconnected" };
      } catch {
        return { status: "disconnected" };
      }
    }
  }
}
