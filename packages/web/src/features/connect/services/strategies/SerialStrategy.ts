import type { Connection } from "@data/schema";
import { TransportWebSerial } from "@meshtastic/transport-web-serial";
import logger from "@core/services/logger";
import { BrowserHardware, type SerialDeviceInfo } from "../BrowserHardware";
import type { ConnectionStrategy, ConnectionResult } from "./types";

export class SerialStrategy implements ConnectionStrategy {
  async connect(
    connection: Connection,
    opts?: { allowPrompt?: boolean },
  ): Promise<ConnectionResult> {
    if (!BrowserHardware.hasSerial()) {
      throw new Error("Web Serial not supported");
    }

    logger.debug(`[SerialStrategy] Looking for Serial port`);

    let port: SerialPort | undefined;
    let newPortInfo: SerialDeviceInfo | undefined;

    // Try to find existing permission
    if (!port) {
      port =
        (await BrowserHardware.findSerialPort(
          connection.usbVendorId,
          connection.usbProductId,
        )) ?? undefined;
      if (port) {
        logger.debug(`[SerialStrategy] Found existing serial port`);
      }
    }

    // Prompt user if allowed and not found
    if (!port && opts?.allowPrompt) {
      logger.debug(`[SerialStrategy] Requesting serial port from user`);
      const result = await BrowserHardware.requestSerialPort();
      port = result?.port;
      newPortInfo = result ?? undefined;
    }

    if (!port) {
      throw new Error("Serial port not available. Re-select the port.");
    }

    // Ensure port is closed before trying to open
    if (BrowserHardware.isSerialPortOpen(port)) {
      logger.debug(`[SerialStrategy] Closing already-open serial port`);
      await BrowserHardware.closeSerialPort(port);
    }

    try {
      logger.debug(`[SerialStrategy] Creating Serial transport`);
      const transport = await TransportWebSerial.createFromPort(port);
      logger.info(`[SerialStrategy] Serial transport created successfully`);

      return {
        transport,
        nativeHandle: port,
        // Include updated port info if user selected a new port
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

  async disconnect(nativeHandle?: any): Promise<void> {
    const port = nativeHandle as SerialPort;
    if (port) {
      logger.debug(`[SerialStrategy] Closing Serial port`);
      try {
        await BrowserHardware.closeSerialPort(port);
      } catch (err) {
        logger.warn(`[SerialStrategy] Error closing Serial port:`, err);
      }
    }
  }
}
