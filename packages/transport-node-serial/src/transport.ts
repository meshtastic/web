import { Readable, Writable } from "node:stream";
import {
  DeviceStatusEnum,
  type DeviceOutput,
  fromDeviceStream,
  toDeviceStream,
  type Transport,
} from "@meshtastic/sdk";
import { SerialPort } from "serialport";

/**
 * Node.js Serial transport for Meshtastic.
 *
 * Implements {@link Transport} on top of a Node `SerialPort`.
 * Use {@link TransportNodeSerial.create} for a convenient factory, or
 * `new TransportNodeSerial(port)` if you already have an open port.
 */
export class TransportNodeSerial implements Transport {
  private readonly _toDevice: WritableStream<Uint8Array>;
  private readonly _fromDevice: ReadableStream<DeviceOutput>;
  private fromDeviceController?: ReadableStreamDefaultController<DeviceOutput>;
  private port: SerialPort | undefined;
  private pipePromise?: Promise<void>;
  private abortController: AbortController;
  private lastStatus: DeviceStatusEnum = DeviceStatusEnum.DeviceDisconnected;
  private closingByUser = false;

  /**
   * Creates and connects a new TransportNode instance.
   * @param path - Path to the serial device
   * @param baudRate - Baud rate for the serial connection (default is 115200).
   * @returns A promise that resolves with a connected TransportNode instance.
   */
  public static create(
    path: string,
    baudRate = 115200,
  ): Promise<TransportNodeSerial> {
    return new Promise((resolve, reject) => {
      const port = new SerialPort({
        path,
        baudRate,
        autoOpen: true,
      });

      const onError = (err: Error) => {
        port.close();
        reject(err);
      };

      port.once("error", onError);
      port.on("open", () => {
        port.removeListener("error", onError);
        resolve(new TransportNodeSerial(port));
      });
    });
  }

  /**
   * Constructs a new TransportNode.
   * @param port - An active Node.js SerialPort connection.
   */
  constructor(port: SerialPort) {
    this.port = port;
    this.port.on("error", (err) => {
      console.error("Serial port connection error:", err);
      this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "port-error");
    });
    this.port.on("close", () => {
      if (this.closingByUser) {
        return;
      }
      this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "port-closed");
    });

    const fromDeviceSource = Readable.toWeb(port) as ReadableStream<Uint8Array>;
    const transformed = fromDeviceSource.pipeThrough(fromDeviceStream());

    this.abortController = new AbortController();
    const controller = this.abortController;

    this._fromDevice = new ReadableStream<DeviceOutput>({
      start: async (ctrl) => {
        this.fromDeviceController = ctrl;

        this.emitStatus(DeviceStatusEnum.DeviceConnecting);
        this.emitStatus(DeviceStatusEnum.DeviceConnected);

        const reader = transformed.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            ctrl.enqueue(value);
          }
          ctrl.close();
        } catch (error) {
          if (this.closingByUser) {
            ctrl.close(); // graceful EOF on user
          } else {
            this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "read-error");
            ctrl.error(
              error instanceof Error ? error : new Error(String(error)),
            );
          }
          try {
            await transformed.cancel();
          } catch {}
        } finally {
          reader.releaseLock();
        }
      },
    });

    // Stream for data going FROM the application TO the Meshtastic device.
    const toDeviceTransform = toDeviceStream();
    this._toDevice = toDeviceTransform.writable;

    this.pipePromise = toDeviceTransform.readable
      .pipeTo(Writable.toWeb(port) as WritableStream<Uint8Array>, {
        signal: controller.signal,
      })
      .catch((error) => {
        if (controller.signal.aborted || this.closingByUser) {
          return;
        }
        console.error("Error piping data to serial port:", error);
        this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "write-error");
        try {
          this.port?.close();
        } catch {}
      });
  }

  /**
   * The WritableStream to send data to the Meshtastic device.
   */
  public get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  /**
   * The ReadableStream to receive data from the Meshtastic device.
   */
  public get fromDevice(): ReadableStream<DeviceOutput> {
    return this._fromDevice;
  }

  /**
   * Disconnect from the serial port and emit `DeviceDisconnected("user")`.
   * Safe to call multiple times.
   */
  async disconnect() {
    try {
      this.closingByUser = true;
      this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "user");

      this.abortController?.abort();
      await this.pipePromise?.catch(() => {});

      try {
        this.port?.close();
      } catch {}
    } finally {
      this.port = undefined;
      this.closingByUser = false;
    }
  }

  private emitStatus(next: DeviceStatusEnum, reason?: string): void {
    if (next === this.lastStatus) {
      return;
    }
    this.lastStatus = next;
    this.fromDeviceController?.enqueue({
      type: "status",
      data: { status: next, reason },
    });
  }
}
