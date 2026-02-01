/**
 * Web Bluetooth API utilities
 *
 * Isolates messy navigator type-casting and capability checks from business logic.
 */

// Extended types for Web Bluetooth API
interface BluetoothAPI {
  getDevices?: () => Promise<BluetoothDevice[]>;
  requestDevice: (options: RequestDeviceOptions) => Promise<BluetoothDevice>;
}

export interface BluetoothDeviceInfo {
  device: BluetoothDevice;
  id: string;
  name?: string;
}

// =============================================================================
// Capability Detection
// =============================================================================

/** Check if Web Bluetooth API is available */
export function hasBluetooth(): boolean {
  return "bluetooth" in navigator;
}

/** Check if Bluetooth getDevices is supported (Chrome only) */
export function hasBluetoothGetDevices(): boolean {
  if (!hasBluetooth()) return false;
  const bt = getBluetoothAPI();
  return typeof bt?.getDevices === "function";
}

/** Get the Bluetooth API interface */
function getBluetoothAPI(): BluetoothAPI | null {
  if (!hasBluetooth()) return null;
  return navigator.bluetooth as BluetoothAPI;
}

// =============================================================================
// Device Management
// =============================================================================

/** Get all known Bluetooth devices (requires getDevices support) */
export async function getBluetoothDevices(): Promise<BluetoothDeviceInfo[]> {
  const bt = getBluetoothAPI();
  if (!bt?.getDevices) return [];

  try {
    const devices = await bt.getDevices();
    return devices.map((device) => ({
      device,
      id: device.id,
      name: device.name,
    }));
  } catch {
    return [];
  }
}

/** Find a Bluetooth device by ID */
export async function findBluetoothDevice(
  deviceId: string,
): Promise<BluetoothDevice | null> {
  const devices = await getBluetoothDevices();
  const found = devices.find((d) => d.id === deviceId);
  return found?.device ?? null;
}

/** Request a new Bluetooth device from user */
export async function requestBluetoothDevice(
  gattServiceUUID?: string | null,
): Promise<BluetoothDevice | null> {
  const bt = getBluetoothAPI();
  if (!bt) return null;

  try {
    const device = await bt.requestDevice({
      acceptAllDevices: !gattServiceUUID,
      optionalServices: gattServiceUUID ? [gattServiceUUID] : undefined,
      filters: gattServiceUUID ? [{ services: [gattServiceUUID] }] : undefined,
    });
    return device;
  } catch {
    return null;
  }
}

// =============================================================================
// Connection Management
// =============================================================================

/** Disconnect a Bluetooth device */
export function disconnectBluetoothDevice(device: BluetoothDevice): void {
  if (device.gatt?.connected) {
    try {
      device.gatt.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}

// =============================================================================
// Event Subscriptions
// =============================================================================

/** Subscribe to Bluetooth device disconnection events */
export function onBluetoothDisconnect(
  device: BluetoothDevice,
  callback: () => void,
): () => void {
  const handler = () => callback();
  device.addEventListener("gattserverdisconnected", handler);
  return () => {
    device.removeEventListener("gattserverdisconnected", handler);
  };
}

/** Subscribe to all known Bluetooth device disconnections */
export async function onAnyBluetoothDisconnect(
  callback: () => void,
): Promise<() => void> {
  const devices = await getBluetoothDevices();
  const cleanups: Array<() => void> = [];

  for (const { device } of devices) {
    const cleanup = onBluetoothDisconnect(device, callback);
    cleanups.push(cleanup);
  }

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
