import type { Connection } from "@data/schema";
import { TransportWebBluetooth } from "@meshtastic/transport-web-bluetooth";
import logger from "@core/services/logger";
import { BrowserHardware } from "../BrowserHardware";
import type { ConnectionStrategy, ConnectionResult } from "./types";

export class BluetoothStrategy implements ConnectionStrategy {
  async connect(
    connection: Connection,
    opts?: { allowPrompt?: boolean },
  ): Promise<ConnectionResult> {
    if (!BrowserHardware.hasBluetooth()) {
      throw new Error("Web Bluetooth not supported");
    }

    logger.debug(`[BluetoothStrategy] Looking for Bluetooth device`);
    
    let bleDevice: BluetoothDevice | undefined;

    // Try to find existing permission
    if (connection.deviceId) {
      bleDevice =
        (await BrowserHardware.findBluetoothDevice(connection.deviceId)) ??
        undefined;
      if (bleDevice) {
        logger.debug(`[BluetoothStrategy] Found existing BT device`);
      }
    }

    // Prompt user if allowed and not found
    if (!bleDevice && opts?.allowPrompt) {
      logger.debug(`[BluetoothStrategy] Requesting new BT device from user`);
      bleDevice =
        (await BrowserHardware.requestBluetoothDevice(
          connection.gattServiceUUID,
        )) ?? undefined;
    }

    if (!bleDevice) {
      throw new Error("Bluetooth device not available. Re-select the device.");
    }

    logger.debug(`[BluetoothStrategy] Creating Bluetooth transport`);
    const transport = await TransportWebBluetooth.createFromDevice(bleDevice);
    logger.info(`[BluetoothStrategy] Bluetooth transport created successfully`);

    return {
      transport,
      nativeHandle: bleDevice,
    };
  }

  async disconnect(nativeHandle?: any): Promise<void> {
    const device = nativeHandle as BluetoothDevice;
    if (device) {
      logger.debug(`[BluetoothStrategy] Disconnecting Bluetooth device`);
      try {
          BrowserHardware.disconnectBluetoothDevice(device);
      } catch (err) {
        logger.warn(
          `[BluetoothStrategy] Error disconnecting Bluetooth device:`,
          err,
        );
      }
    }
  }
}
