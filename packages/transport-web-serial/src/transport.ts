import type { Types } from "@meshtastic/core";
import { Utils } from "@meshtastic/core";

export class TransportWebSerial implements Types.Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<Types.DeviceOutput>;
  private connection: SerialPort;
  private pipePromise: Promise<void> | null = null;
  private abortController = new AbortController();

  public static async create(baudRate?: number): Promise<TransportWebSerial> {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: baudRate || 115200 });
    return new TransportWebSerial(port);
  }

  public static async createFromPort(
    port: SerialPort,
    baudRate?: number,
  ): Promise<TransportWebSerial> {
    await port.open({ baudRate: baudRate || 115200 });
    return new TransportWebSerial(port);
  }

  constructor(connection: SerialPort) {
    if (!connection.readable || !connection.writable) {
      throw new Error("Stream not accessible");
    }

    this.connection = connection;

    // Set up the pipe with abort signal for clean cancellation
    this.pipePromise = Utils.toDeviceStream.readable.pipeTo(
      connection.writable,
      { signal: this.abortController.signal }
    );

    this._toDevice = Utils.toDeviceStream.writable;
    this._fromDevice = connection.readable.pipeThrough(
      Utils.fromDeviceStream(),
    );
  }

  get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  get fromDevice(): ReadableStream<Types.DeviceOutput> {
    return this._fromDevice;
  }

  /**
   * Safely disconnects the serial port, following best practices from
   * https://github.com/WICG/serial/. Cancels any active pipe
   * operations and only closes the port after streams are unlocked.
   */
  async disconnect() {
    try {
      this.abortController.abort();
      
      if (this.pipePromise) {
        try {
          await this.pipePromise;
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            throw error;
          }
        }
      }

      // Cancel any remaining streams
      if (this._fromDevice && this._fromDevice.locked) {
        try {
          await this._fromDevice.cancel();
        } catch (error) {
          // Stream cancellation might fail if already cancelled
        }
      }

      await this.connection.close();
      
    } catch (error) {
      // If we can't close cleanly, let the browser handle cleanup
      console.warn('Could not cleanly disconnect serial port:', error);
    }
  }
}
