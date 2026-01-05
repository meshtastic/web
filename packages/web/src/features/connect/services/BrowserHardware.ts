/**
 * BrowserHardware - Abstracts browser hardware APIs (Web Bluetooth, Web Serial)
 *
 * Isolates the messy navigator type-casting and capability checks from business logic.
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

// Extended types for Web Bluetooth API
interface BluetoothAPI {
  getDevices?: () => Promise<BluetoothDevice[]>;
  requestDevice: (options: RequestDeviceOptions) => Promise<BluetoothDevice>;
}

export interface SerialDeviceInfo {
  port: SerialPort;
  usbVendorId?: number;
  usbProductId?: number;
}

export interface BluetoothDeviceInfo {
  device: BluetoothDevice;
  id: string;
  name?: string;
}

/**
 * Browser hardware capability detection and access
 */
export const BrowserHardware = {

  /**
   * Check if Web Serial API is available
   */
  hasSerial(): boolean {
    return "serial" in navigator;
  },

  /**
   * Check if Web Bluetooth API is available
   */
  hasBluetooth(): boolean {
    return "bluetooth" in navigator;
  },

  /**
   * Check if Bluetooth getDevices is supported (Chrome only)
   */
  hasBluetoothGetDevices(): boolean {
    if (!this.hasBluetooth()) return false;
    const bt = this.getBluetoothAPI();
    return typeof bt?.getDevices === "function";
  },


  /**
   * Get the Serial API interface
   */
  getSerialAPI(): SerialAPI | null {
    if (!this.hasSerial()) return null;
    return (navigator as unknown as { serial: SerialAPI }).serial;
  },

  /**
   * Get all permitted serial ports
   */
  async getSerialPorts(): Promise<SerialDeviceInfo[]> {
    const serial = this.getSerialAPI();
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
  },

  /**
   * Find a serial port by vendor/product ID
   */
  async findSerialPort(
    usbVendorId?: number | null,
    usbProductId?: number | null,
  ): Promise<SerialPort | null> {
    const ports = await this.getSerialPorts();
    const found = ports.find(
      (p) =>
        p.usbVendorId === usbVendorId && p.usbProductId === usbProductId,
    );
    return found?.port ?? null;
  },

  /**
   * Request a new serial port from user
   */
  async requestSerialPort(): Promise<SerialDeviceInfo | null> {
    const serial = this.getSerialAPI();
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
  },

  /**
   * Close a serial port safely
   */
  async closeSerialPort(port: SerialPort): Promise<void> {
    const portWithStreams = port as SerialPort & {
      readable: ReadableStream | null;
      writable: WritableStream | null;
      close: () => Promise<void>;
    };
    if (portWithStreams.readable || portWithStreams.writable) {
      try {
        await portWithStreams.close();
        // Give the port time to fully close
        await new Promise((r) => setTimeout(r, 100));
      } catch {
        // Ignore close errors
      }
    }
  },

  /**
   * Check if a serial port is open
   */
  isSerialPortOpen(port: SerialPort): boolean {
    const portWithStreams = port as SerialPort & {
      readable: ReadableStream | null;
      writable: WritableStream | null;
    };
    return !!(portWithStreams.readable || portWithStreams.writable);
  },

  /**
   * Subscribe to serial connect/disconnect events
   */
  onSerialDeviceChange(callback: () => void): () => void {
    const serial = this.getSerialAPI();
    if (!serial) return () => {};

    const handler = () => callback();
    serial.addEventListener("connect", handler);
    serial.addEventListener("disconnect", handler);

    return () => {
      serial.removeEventListener("connect", handler);
      serial.removeEventListener("disconnect", handler);
    };
  },


  /**
   * Get the Bluetooth API interface
   */
  getBluetoothAPI(): BluetoothAPI | null {
    if (!this.hasBluetooth()) return null;
    return navigator.bluetooth as BluetoothAPI;
  },

  /**
   * Get all known Bluetooth devices (requires getDevices support)
   */
  async getBluetoothDevices(): Promise<BluetoothDeviceInfo[]> {
    const bt = this.getBluetoothAPI();
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
  },

  /**
   * Find a Bluetooth device by ID
   */
  async findBluetoothDevice(deviceId: string): Promise<BluetoothDevice | null> {
    const devices = await this.getBluetoothDevices();
    const found = devices.find((d) => d.id === deviceId);
    return found?.device ?? null;
  },

  /**
   * Request a new Bluetooth device from user
   */
  async requestBluetoothDevice(
    gattServiceUUID?: string | null,
  ): Promise<BluetoothDevice | null> {
    const bt = this.getBluetoothAPI();
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
  },

  /**
   * Disconnect a Bluetooth device
   */
  disconnectBluetoothDevice(device: BluetoothDevice): void {
    if (device.gatt?.connected) {
      try {
        device.gatt.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
  },

  /**
   * Subscribe to Bluetooth device disconnection events
   */
  onBluetoothDisconnect(
    device: BluetoothDevice,
    callback: () => void,
  ): () => void {
    const handler = () => callback();
    device.addEventListener("gattserverdisconnected", handler);
    return () => {
      device.removeEventListener("gattserverdisconnected", handler);
    };
  },

  /**
   * Subscribe to all known Bluetooth device disconnections
   */
  async onAnyBluetoothDisconnect(callback: () => void): Promise<() => void> {
    const devices = await this.getBluetoothDevices();
    const cleanups: Array<() => void> = [];

    for (const { device } of devices) {
      const cleanup = this.onBluetoothDisconnect(device, callback);
      cleanups.push(cleanup);
    }

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  },
};
