import { Readable, Writable } from "node:stream";
import type { Types } from "@meshtastic/core";
import { Utils } from "@meshtastic/core";
import { SerialPort } from "serialport";

export class TransportNodeSerial implements Types.Transport {
  private readonly _toDevice: WritableStream<Uint8Array>;
  private readonly _fromDevice: ReadableStream<Types.DeviceOutput>;
  private port: SerialPort | undefined;

  /**
   * Creates and connects a new TransportNode instance.
   * @param path - Path to the serial device
   * @param baudRate - The port number for the TCP connection (defaults to 4403).
   * @returns A promise that resolves with a connected TransportNode instance.
   */
  public static create(path: string, baudRate = 115200): Promise<TransportNodeSerial> {
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
   * @param connection - An active Node.js net.Socket connection.
   */
  constructor(port: SerialPort) {
    this.port = port;
    this.port.on("error", (err) => {
      console.error("Serial port connection error:", err);
    });

    const fromDeviceSource = Readable.toWeb(
      port,
    ) as ReadableStream<Uint8Array>;
    this._fromDevice = fromDeviceSource.pipeThrough(Utils.fromDeviceStream());

    // Stream for data going FROM the application TO the Meshtastic device.
    const toDeviceTransform = Utils.toDeviceStream;
    this._toDevice = toDeviceTransform.writable;

    // The readable end of the transform is then piped to the Node.js socket.
    // A similar assertion is needed here because `Writable.toWeb` also returns
    // a generically typed stream (`WritableStream<any>`).
    toDeviceTransform.readable
      .pipeTo(Writable.toWeb(port) as WritableStream<Uint8Array>)
      .catch((err) => {
        console.error("Error piping data to socket:", err);
        this.port.close(err as Error);
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

  disconnect() {
    this.port.close();
    this.port = undefined;
    return Promise.resolve();
  }
}
