import { Readable, Writable } from "node:stream";
import { Types, Utils } from "@meshtastic/core";
import { SerialPort } from "serialport";

/**
 * Node.js Serial transport for Meshtastic.
 *
 * Implements {@link Types.Transport} on top of a Node `SerialPort`.
 * Use {@link TransportNodeSerial.create} for a convenient factory, or
 * `new TransportNodeSerial(port)` if you already have an open port.
 */
export class TransportNodeSerial implements Types.Transport {
  private readonly _toDevice: WritableStream<Uint8Array>;
  private readonly _fromDevice: ReadableStream<Types.DeviceOutput>;
  private _fromDeviceController?: ReadableStreamDefaultController<Types.DeviceOutput>;
  private port: SerialPort | undefined;

  private _lastStatus: Types.DeviceStatusEnum =
    Types.DeviceStatusEnum.DeviceDisconnected;
  private _closingByUser = false;

  /**
   * Creates and connects a new TransportNode instance.
   * @param path - Path to the serial device
   * @param baudRate - The port number for the TCP connection (defaults to 4403).
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
      this.emitStatus(Types.DeviceStatusEnum.DeviceDisconnected, "port-error");
    });
    this.port.on("close", () => {
      if (this._closingByUser) {
        return;
      }
      this.emitStatus(Types.DeviceStatusEnum.DeviceDisconnected, "port-closed");
    });

    const fromDeviceSource = Readable.toWeb(port) as ReadableStream<Uint8Array>;
    const transformed = fromDeviceSource.pipeThrough(Utils.fromDeviceStream());

    this._fromDevice = new ReadableStream<Types.DeviceOutput>({
      start: async (ctrl) => {
        this._fromDeviceController = ctrl;

        this.emitStatus(Types.DeviceStatusEnum.DeviceConnecting);
        this.emitStatus(Types.DeviceStatusEnum.DeviceConnected);

        const reader = transformed.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            if (value) {
              ctrl.enqueue(value);
            }
          }
        } catch {
          this.emitStatus(
            Types.DeviceStatusEnum.DeviceDisconnected,
            "read-error",
          );
        } finally {
          reader.releaseLock();
        }
      },
    });

    // Stream for data going FROM the application TO the Meshtastic device.
    const toDeviceTransform = Utils.toDeviceStream;
    this._toDevice = toDeviceTransform.writable;

    toDeviceTransform.readable
      .pipeTo(Writable.toWeb(port) as WritableStream<Uint8Array>)
      .catch((err) => {
        console.error("Error piping data to serial port:", err);
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
  public get fromDevice(): ReadableStream<Types.DeviceOutput> {
    return this._fromDevice;
  }

  /**
   * Disconnect from the serial port and emit `DeviceDisconnected("user")`.
   * Safe to call multiple times.
   */
  disconnect() {
    try {
      this._closingByUser = true;
      this.port?.close();
    } finally {
      this.emitStatus(Types.DeviceStatusEnum.DeviceDisconnected, "user");
      this.port = undefined;
      this._closingByUser = false;
    }
    return Promise.resolve();
  }

  private emitStatus(next: Types.DeviceStatusEnum, reason?: string): void {
    if (next === this._lastStatus) {
      return;
    }
    this._lastStatus = next;
    this._fromDeviceController?.enqueue({
      type: "status",
      data: { status: next, reason },
    });
  }
}
