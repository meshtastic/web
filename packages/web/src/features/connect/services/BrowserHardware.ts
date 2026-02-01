/**
 * BrowserHardware - Re-export browser hardware utilities
 *
 * This module provides backward compatibility for code importing from BrowserHardware.
 * New code should import directly from browserSerial.ts or browserBluetooth.ts.
 */

import * as serial from "./browserSerial";
import * as bluetooth from "./browserBluetooth";

// Re-export types
export type { SerialDeviceInfo } from "./browserSerial";
export type { BluetoothDeviceInfo } from "./browserBluetooth";

/**
 * Browser hardware capability detection and access
 *
 * @deprecated Import directly from browserSerial.ts or browserBluetooth.ts instead
 */
export const BrowserHardware = {
  // Serial capabilities
  hasSerial: serial.hasSerial,
  getSerialPorts: serial.getSerialPorts,
  findSerialPort: serial.findSerialPort,
  requestSerialPort: serial.requestSerialPort,
  closeSerialPort: serial.closeSerialPort,
  isSerialPortOpen: serial.isSerialPortOpen,
  onSerialDeviceChange: serial.onSerialDeviceChange,

  // Bluetooth capabilities
  hasBluetooth: bluetooth.hasBluetooth,
  hasBluetoothGetDevices: bluetooth.hasBluetoothGetDevices,
  getBluetoothDevices: bluetooth.getBluetoothDevices,
  findBluetoothDevice: bluetooth.findBluetoothDevice,
  requestBluetoothDevice: bluetooth.requestBluetoothDevice,
  disconnectBluetoothDevice: bluetooth.disconnectBluetoothDevice,
  onBluetoothDisconnect: bluetooth.onBluetoothDisconnect,
  onAnyBluetoothDisconnect: bluetooth.onAnyBluetoothDisconnect,
};
