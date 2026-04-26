import type { Connection } from "@core/stores/deviceStore/types";
import { testHttpReachable } from "@pages/Connections/utils";
import { TransportHTTP } from "@meshtastic/transport-http";
import { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import type { AnyTransport } from "./sdkClient.ts";

/**
 * Per-transport-type factories. Each resolves a Transport from a saved
 * Connection record + an optional cached BluetoothDevice/SerialPort the
 * caller has held onto across reconnects.
 */

export interface OpenTransportOptions {
  /** Whether the user explicitly initiated this connection (allows BT/Serial pickers). */
  allowPrompt?: boolean;
  /** Cached BT device from a prior connect, if any. */
  cachedBluetoothDevice?: BluetoothDevice;
  /** Cached serial port from a prior connect, if any. */
  cachedSerialPort?: SerialPort;
}

export interface OpenTransportResult {
  transport: AnyTransport;
  /** BT device (when type=bluetooth) so caller can cache for cleanup + reconnect. */
  bluetoothDevice?: BluetoothDevice;
  /** Serial port (when type=serial) so caller can cache for cleanup + reconnect. */
  serialPort?: SerialPort;
}

export async function openTransport(
  conn: Connection,
  opts: OpenTransportOptions = {},
): Promise<OpenTransportResult> {
  switch (conn.type) {
    case "http":
      return openHttp(conn);
    case "bluetooth":
      return openBluetooth(conn, opts);
    case "serial":
      return openSerial(conn, opts);
    default: {
      const _exhaustive: never = conn;
      void _exhaustive;
      throw new Error(`Unknown transport type: ${(conn as { type?: string }).type}`);
    }
  }
}

async function openHttp(
  conn: Connection & { type: "http"; url: string },
): Promise<OpenTransportResult> {
  const ok = await testHttpReachable(conn.url);
  if (!ok) {
    const url = new URL(conn.url);
    const isHTTPS = url.protocol === "https:";
    throw new Error(
      isHTTPS
        ? `Cannot reach HTTPS endpoint. If using a self-signed certificate, open ${conn.url} in a new tab, accept the certificate warning, then try connecting again.`
        : "HTTP endpoint not reachable (may be blocked by CORS)",
    );
  }
  const url = new URL(conn.url);
  const isTLS = url.protocol === "https:";
  const transport = await TransportHTTP.create(url.host, isTLS);
  return { transport };
}

async function openBluetooth(
  conn: Connection & {
    type: "bluetooth";
    deviceId?: string;
    gattServiceUUID?: string;
  },
  opts: OpenTransportOptions,
): Promise<OpenTransportResult> {
  if (!("bluetooth" in navigator)) {
    throw new Error("Web Bluetooth not supported");
  }

  let device = opts.cachedBluetoothDevice;
  if (!device) {
    const bt = navigator.bluetooth as Navigator["bluetooth"] & {
      getDevices?: () => Promise<BluetoothDevice[]>;
    };
    if (bt.getDevices) {
      const known = await bt.getDevices();
      if (known.length > 0 && conn.deviceId) {
        device = known.find((d) => d.id === conn.deviceId);
      }
    }
  }
  if (!device && opts.allowPrompt) {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: !conn.gattServiceUUID,
      optionalServices: conn.gattServiceUUID ? [conn.gattServiceUUID] : undefined,
      filters: conn.gattServiceUUID ? [{ services: [conn.gattServiceUUID] }] : undefined,
    });
  }
  if (!device) {
    throw new Error("Bluetooth device not available. Re-select the device.");
  }

  const transport = await TransportWebBluetooth.createFromDevice(device);
  return { transport, bluetoothDevice: device };
}

async function openSerial(
  conn: Connection & {
    type: "serial";
    usbVendorId?: number;
    usbProductId?: number;
  },
  opts: OpenTransportOptions,
): Promise<OpenTransportResult> {
  if (!("serial" in navigator)) {
    throw new Error("Web Serial not supported");
  }

  const serial = (
    navigator as Navigator & {
      serial: {
        getPorts: () => Promise<SerialPort[]>;
        requestPort: (options: Record<string, unknown>) => Promise<SerialPort>;
      };
    }
  ).serial;

  let port = opts.cachedSerialPort;
  if (!port) {
    const ports = await serial.getPorts();
    if (ports && conn.usbVendorId && conn.usbProductId) {
      port = ports.find((p: SerialPort) => {
        const info =
          (
            p as SerialPort & {
              getInfo?: () => { usbVendorId?: number; usbProductId?: number };
            }
          ).getInfo?.() ?? {};
        return info.usbVendorId === conn.usbVendorId && info.usbProductId === conn.usbProductId;
      });
    }
  }
  if (!port && opts.allowPrompt) {
    port = await serial.requestPort({});
  }
  if (!port) {
    throw new Error("Serial port not available. Re-select the port.");
  }

  // Close-then-reopen cycle in case a prior connection left streams open.
  const portWithStreams = port as SerialPort & {
    readable: ReadableStream | null;
    writable: WritableStream | null;
    close: () => Promise<void>;
  };
  if (portWithStreams.readable || portWithStreams.writable) {
    try {
      await portWithStreams.close();
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.warn("[transports] error closing serial port before reconnect:", err);
    }
  }

  const transport = await TransportWebSerial.createFromPort(port);
  return { transport, serialPort: port };
}

/**
 * Probes a saved connection for reachability/permission without opening it.
 * Used by refreshStatuses to update the saved-connection status badges.
 */
export async function probeConnection(
  conn: Connection,
): Promise<"online" | "configured" | "disconnected" | "error"> {
  switch (conn.type) {
    case "http": {
      const ok = await testHttpReachable(conn.url);
      return ok ? "online" : "error";
    }
    case "bluetooth": {
      if (!("bluetooth" in navigator)) return "disconnected";
      try {
        const known = await (
          navigator.bluetooth as Navigator["bluetooth"] & {
            getDevices?: () => Promise<BluetoothDevice[]>;
          }
        ).getDevices?.();
        const hasPermission = known?.some((d: BluetoothDevice) => d.id === conn.deviceId);
        // Permission granted ≠ device configured. The card surfaces "online"
        // (i.e. "available, click to connect") so the user explicitly opts
        // into the configure handshake. "configured" is reserved for when
        // the firmware has actually replied with config-complete.
        return hasPermission ? "online" : "disconnected";
      } catch {
        return "disconnected";
      }
    }
    case "serial": {
      if (!("serial" in navigator)) return "disconnected";
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
                getInfo?: () => { usbVendorId?: number; usbProductId?: number };
              }
            ).getInfo?.() ?? {};
          return info.usbVendorId === conn.usbVendorId && info.usbProductId === conn.usbProductId;
        });
        return hasPermission ? "online" : "disconnected";
      } catch {
        return "disconnected";
      }
    }
  }
}

/**
 * Best-effort cleanup for a held-onto BT device or serial port. Safe on either.
 */
export function closeTransport(handle: BluetoothDevice | SerialPort | undefined): void {
  if (!handle) return;
  const bt = handle as BluetoothDevice;
  if (bt.gatt?.connected) {
    try {
      bt.gatt.disconnect();
    } catch {}
  }
  const port = handle as SerialPort & { close?: () => Promise<void> };
  if (port.close) {
    try {
      port.close();
    } catch {}
  }
}
