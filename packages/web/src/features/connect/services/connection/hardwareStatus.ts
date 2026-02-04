/**
 * Hardware Status
 *
 * Handles hardware availability checking for different connection types.
 */
import { connectionRepo } from "@data/repositories";
import { ConnectionTypes } from "@data/repositories/ConnectionRepository";
import type { Connection } from "@data/schema";
import { testHttpReachable } from "../../utils";
import * as browserBluetooth from "../browserBluetooth";
import * as browserSerial from "../browserSerial";

/**
 * Check HTTP endpoint reachability and update connection status
 */
export async function checkHttpStatus(id: number, url: string): Promise<void> {
  const ok = await testHttpReachable(url);
  await connectionRepo.updateStatus(id, ok ? "online" : "error");
}

/**
 * Check Bluetooth device availability and update connection status
 */
export async function checkBluetoothStatus(
  id: number,
  deviceId: string | null,
): Promise<void> {
  if (!browserBluetooth.hasBluetooth()) {
    return;
  }
  const devices = await browserBluetooth.getBluetoothDevices();
  const found = devices.some((d) => d.id === deviceId);
  await connectionRepo.updateStatus(id, found ? "online" : "disconnected");
}

/**
 * Check Serial port availability and update connection status
 */
export async function checkSerialStatus(
  id: number,
  vendorId: number | null,
  productId: number | null,
): Promise<void> {
  if (!browserSerial.hasSerial()) {
    return;
  }
  const ports = await browserSerial.getSerialPorts();
  const found = ports.some(
    (p) => p.usbVendorId === vendorId && p.usbProductId === productId,
  );
  await connectionRepo.updateStatus(id, found ? "online" : "disconnected");
}

/**
 * Check if hardware is available for a connection (for auto-reconnect)
 */
export async function checkHardwareAvailable(
  conn: Connection,
): Promise<boolean> {
  switch (conn.type) {
    case ConnectionTypes.SERIAL: {
      if (!browserSerial.hasSerial()) {
        return false;
      }
      const port = await browserSerial.findSerialPort(
        conn.usbVendorId,
        conn.usbProductId,
      );
      return port !== null;
    }

    case ConnectionTypes.BLUETOOTH: {
      if (!browserBluetooth.hasBluetoothGetDevices() || !conn.deviceId) {
        return false;
      }
      const device = await browserBluetooth.findBluetoothDevice(conn.deviceId);
      return device !== null;
    }

    case ConnectionTypes.HTTP:
    case ConnectionTypes.DEMO:
      return true;

    default:
      return false;
  }
}

/**
 * Create status check promises for a connection
 */
export function createStatusCheck(conn: Connection): Promise<void>[] {
  switch (conn.type) {
    case ConnectionTypes.HTTP:
      if (!conn.url) {
        return [];
      }
      return [checkHttpStatus(conn.id, conn.url)];

    case ConnectionTypes.BLUETOOTH:
      return [checkBluetoothStatus(conn.id, conn.deviceId)];

    case ConnectionTypes.SERIAL:
      return [checkSerialStatus(conn.id, conn.usbVendorId, conn.usbProductId)];

    default:
      return [];
  }
}
