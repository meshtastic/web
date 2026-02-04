/**
 * Transport Factory
 *
 * Handles creation and cleanup of transport connections (HTTP, Bluetooth, Serial, Demo).
 */
import logger from "@core/services/logger";
import { ConnectionTypes } from "@data/repositories/ConnectionRepository";
import type { Connection } from "@data/schema";
import { TransportHTTP } from "@meshtastic/transport-http";
import { TransportMock } from "@meshtastic/transport-mock";
import { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import { testHttpReachable } from "../../utils";
import * as browserBluetooth from "../browserBluetooth";
import * as browserSerial from "../browserSerial";
import type { SerialDeviceInfo } from "../browserSerial";

/** Transport type from SDK transports */
export type PacketTransport =
  | Awaited<ReturnType<typeof TransportHTTP.create>>
  | Awaited<ReturnType<typeof TransportWebBluetooth.createFromDevice>>
  | Awaited<ReturnType<typeof TransportWebSerial.createFromPort>>
  | TransportMock;

/** Result of creating a transport connection */
export interface TransportResult {
  transport: PacketTransport;
  nativeHandle?: unknown;
  onDisconnect?: () => void;
  updatedPortInfo?: {
    usbVendorId?: number;
    usbProductId?: number;
  };
}

interface CreateTransportOptions {
  allowPrompt?: boolean;
}

/**
 * Create a transport for the given connection type
 */
export async function createTransport(
  conn: Connection,
  opts?: CreateTransportOptions,
): Promise<TransportResult> {
  switch (conn.type) {
    case ConnectionTypes.HTTP:
      return createHttpTransport(conn);
    case ConnectionTypes.BLUETOOTH:
      return createBluetoothTransport(conn, opts);
    case ConnectionTypes.SERIAL:
      return createSerialTransport(conn, opts);
    case ConnectionTypes.DEMO:
      return createDemoTransport();
    default:
      throw new Error(`Unknown connection type: ${conn.type}`);
  }
}

/**
 * Create an HTTP transport
 */
async function createHttpTransport(conn: Connection): Promise<TransportResult> {
  if (!conn.url) {
    throw new Error("HTTP connection missing URL");
  }

  logger.debug(`[transportFactory] Testing HTTP reachability: ${conn.url}`);
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
  logger.debug(`[transportFactory] Creating HTTP transport for ${url.host}`);

  const transport = await TransportHTTP.create(
    url.host,
    url.protocol === "https:",
  );

  logger.info(`[transportFactory] HTTP transport created successfully`);

  return { transport, nativeHandle: undefined };
}

/**
 * Create a Bluetooth transport
 */
async function createBluetoothTransport(
  conn: Connection,
  opts?: CreateTransportOptions,
): Promise<TransportResult> {
  if (!browserBluetooth.hasBluetooth()) {
    throw new Error("Web Bluetooth not supported");
  }

  logger.debug(`[transportFactory] Looking for Bluetooth device`);

  let bleDevice: BluetoothDevice | undefined;

  // Try to find existing permission
  if (conn.deviceId) {
    bleDevice =
      (await browserBluetooth.findBluetoothDevice(conn.deviceId)) ?? undefined;
    if (bleDevice) {
      logger.debug(`[transportFactory] Found existing BT device`);
    }
  }

  // Prompt user if allowed and not found
  if (!bleDevice && opts?.allowPrompt) {
    logger.debug(`[transportFactory] Requesting new BT device from user`);
    bleDevice =
      (await browserBluetooth.requestBluetoothDevice(conn.gattServiceUUID)) ??
      undefined;
  }

  if (!bleDevice) {
    throw new Error("Bluetooth device not available. Re-select the device.");
  }

  logger.debug(`[transportFactory] Creating Bluetooth transport`);
  const transport = await TransportWebBluetooth.createFromDevice(bleDevice);
  logger.info(`[transportFactory] Bluetooth transport created successfully`);

  return { transport, nativeHandle: bleDevice };
}

/**
 * Create a Serial transport
 */
async function createSerialTransport(
  conn: Connection,
  opts?: CreateTransportOptions,
): Promise<TransportResult> {
  if (!browserSerial.hasSerial()) {
    throw new Error("Web Serial not supported");
  }

  logger.debug(`[transportFactory] Looking for Serial port`);

  let port: SerialPort | undefined;
  let newPortInfo: SerialDeviceInfo | undefined;

  // Try to find existing permission
  port =
    (await browserSerial.findSerialPort(conn.usbVendorId, conn.usbProductId)) ??
    undefined;
  if (port) {
    logger.debug(`[transportFactory] Found existing serial port`);
  }

  // Prompt user if allowed and not found
  if (!port && opts?.allowPrompt) {
    logger.debug(`[transportFactory] Requesting serial port from user`);
    const result = await browserSerial.requestSerialPort();
    port = result?.port;
    newPortInfo = result ?? undefined;
  }

  if (!port) {
    throw new Error("Serial port not available. Re-select the port.");
  }

  // Ensure port is closed before trying to open
  if (browserSerial.isSerialPortOpen(port)) {
    logger.debug(`[transportFactory] Closing already-open serial port`);
    await browserSerial.closeSerialPort(port);
  }

  try {
    logger.debug(`[transportFactory] Creating Serial transport`);
    const transport = await TransportWebSerial.createFromPort(port);
    logger.info(`[transportFactory] Serial transport created successfully`);

    return {
      transport,
      nativeHandle: port,
      updatedPortInfo: newPortInfo
        ? {
            usbVendorId: newPortInfo.usbVendorId,
            usbProductId: newPortInfo.usbProductId,
          }
        : undefined,
    };
  } catch (serialErr: unknown) {
    const msg =
      serialErr instanceof Error ? serialErr.message : String(serialErr);

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
}

/**
 * Create a Demo transport
 */
function createDemoTransport(): TransportResult {
  logger.info("[transportFactory] Creating Demo transport");
  const transport = TransportMock.create({
    scenario: "default",
    debug: false,
  });
  return { transport, nativeHandle: undefined };
}

/**
 * Disconnect a transport by type
 */
export async function disconnectTransport(
  type: Connection["type"],
  nativeHandle: unknown,
): Promise<void> {
  switch (type) {
    case ConnectionTypes.BLUETOOTH: {
      const device = nativeHandle as BluetoothDevice | undefined;
      if (device) {
        logger.debug(`[transportFactory] Disconnecting Bluetooth device`);
        try {
          browserBluetooth.disconnectBluetoothDevice(device);
        } catch (err) {
          logger.warn(
            `[transportFactory] Error disconnecting Bluetooth device:`,
            err,
          );
        }
      }
      break;
    }

    case ConnectionTypes.SERIAL: {
      const port = nativeHandle as SerialPort | undefined;
      if (port) {
        logger.debug(`[transportFactory] Closing Serial port`);
        try {
          await browserSerial.closeSerialPort(port);
        } catch (err) {
          logger.warn(`[transportFactory] Error closing Serial port:`, err);
        }
      }
      break;
    }

    case ConnectionTypes.HTTP:
    case ConnectionTypes.DEMO:
      // HTTP and demo transports are stateless, no persistent connection to close
      break;
  }
}
