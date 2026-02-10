/**
 * Web Serial API utilities
 *
 * Isolates messy navigator type-casting and capability checks from business logic.
 */

// Extended types for Web Serial API
interface SerialAPI {
  getPorts: () => Promise<SerialPort[]>;
  requestPort: (options?: SerialPortRequestOptions) => Promise<SerialPort>;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
}

interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

export interface SerialDeviceInfo {
  port: SerialPort;
  usbVendorId?: number;
  usbProductId?: number;
}

// =============================================================================
// Capability Detection
// =============================================================================

/** Check if Web Serial API is available */
export function hasSerial(): boolean {
  return "serial" in navigator;
}

/** Get the Serial API interface */
function getSerialAPI(): SerialAPI | null {
  if (!hasSerial()) return null;
  return (navigator as unknown as { serial: SerialAPI }).serial;
}

// =============================================================================
// Port Management
// =============================================================================

/** Get all permitted serial ports */
export async function getSerialPorts(): Promise<SerialDeviceInfo[]> {
  const serial = getSerialAPI();
  if (!serial) return [];

  try {
    const ports = await serial.getPorts();
    return ports.map((port) => {
      const portWithInfo = port as SerialPort & {
        getInfo?: () => SerialPortInfo;
      };
      const info = portWithInfo.getInfo?.() ?? {};
      return {
        port,
        usbVendorId: info.usbVendorId,
        usbProductId: info.usbProductId,
      };
    });
  } catch {
    return [];
  }
}

/** Find a serial port by vendor/product ID */
export async function findSerialPort(
  usbVendorId?: number | null,
  usbProductId?: number | null,
): Promise<SerialPort | null> {
  const ports = await getSerialPorts();
  const found = ports.find(
    (p) => p.usbVendorId === usbVendorId && p.usbProductId === usbProductId,
  );
  return found?.port ?? null;
}

/** Request a new serial port from user */
export async function requestSerialPort(): Promise<SerialDeviceInfo | null> {
  const serial = getSerialAPI();
  if (!serial) return null;

  try {
    const port = await serial.requestPort({});
    const portWithInfo = port as SerialPort & {
      getInfo?: () => SerialPortInfo;
    };
    const info = portWithInfo.getInfo?.() ?? {};
    return {
      port,
      usbVendorId: info.usbVendorId,
      usbProductId: info.usbProductId,
    };
  } catch {
    return null;
  }
}

// =============================================================================
// Port Operations
// =============================================================================

/** Close a serial port safely */
export async function closeSerialPort(port: SerialPort): Promise<void> {
  const portWithStreams = port as SerialPort & {
    readable: ReadableStream | null;
    writable: WritableStream | null;
    close: () => Promise<void>;
  };

  // Release locked streams before closing
  try {
    if (portWithStreams.readable?.locked) {
      await portWithStreams.readable.cancel().catch(() => {});
    }
  } catch {
    // Ignore cancel errors
  }

  try {
    if (portWithStreams.writable?.locked) {
      await portWithStreams.writable.abort().catch(() => {});
    }
  } catch {
    // Ignore abort errors
  }

  if (portWithStreams.readable || portWithStreams.writable) {
    try {
      await portWithStreams.close();
      // Give the port time to fully close
      await new Promise((r) => setTimeout(r, 100));
    } catch {
      // Ignore close errors
    }
  }
}

/** Check if a serial port is open */
export function isSerialPortOpen(port: SerialPort): boolean {
  const portWithStreams = port as SerialPort & {
    readable: ReadableStream | null;
    writable: WritableStream | null;
  };
  return !!(portWithStreams.readable || portWithStreams.writable);
}

/**
 * Force release of locked streams on a serial port.
 * Use when streams are locked but port appears closed.
 */
export async function forceReleaseStreams(port: SerialPort): Promise<void> {
  const portWithStreams = port as SerialPort & {
    readable: ReadableStream | null;
    writable: WritableStream | null;
  };

  let neededCleanup = false;

  try {
    if (portWithStreams.readable?.locked) {
      await portWithStreams.readable.cancel().catch(() => {});
      neededCleanup = true;
    }
  } catch {
    // Ignore errors
  }

  try {
    if (portWithStreams.writable?.locked) {
      await portWithStreams.writable.abort().catch(() => {});
      neededCleanup = true;
    }
  } catch {
    // Ignore errors
  }

  if (neededCleanup) {
    // Give streams time to fully release
    await new Promise((r) => setTimeout(r, 200));
  }
}

// =============================================================================
// Event Subscriptions
// =============================================================================

/** Subscribe to serial connect/disconnect events */
export function onSerialDeviceChange(callback: () => void): () => void {
  const serial = getSerialAPI();
  if (!serial) return () => {};

  const handler = () => callback();
  serial.addEventListener("connect", handler);
  serial.addEventListener("disconnect", handler);

  return () => {
    serial.removeEventListener("connect", handler);
    serial.removeEventListener("disconnect", handler);
  };
}
