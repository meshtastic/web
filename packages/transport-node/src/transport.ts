import { Socket } from "node:net";
import { Readable, Writable } from "node:stream";
import { Types, Utils } from "@meshtastic/core";

/**
 * Node.js TCP transport for Meshtastic.
 *
 * Implements {@link Types.Transport} on top of a Node `net.Socket`.
 * Use {@link TransportNode.create} to open a new connection, or
 * construct directly with an existing socket.
 */
export class TransportNode implements Types.Transport {
  private readonly _toDevice: WritableStream<Uint8Array>;
  private readonly _fromDevice: ReadableStream<Types.DeviceOutput>;
  private _fromDeviceController?: ReadableStreamDefaultController<Types.DeviceOutput>;
  private socket: Socket | undefined;

  private _lastStatus: Types.DeviceStatusEnum =
    Types.DeviceStatusEnum.DeviceDisconnected;

  private _closingByUser = false;

  /**
   * Creates and connects a new TransportNode instance.
   * @param hostname - The IP address or hostname of the Meshtastic device.
   * @param port - The port number for the TCP connection (defaults to 4403).
   * @returns A promise that resolves with a connected TransportNode instance.
   */
  public static create(hostname: string, port = 4403): Promise<TransportNode> {
    return new Promise((resolve, reject) => {
      const socket = new Socket();

      const onError = (err: Error) => {
        socket.destroy();
        reject(err);
      };

      socket.once("error", onError);

      socket.connect(port, hostname, () => {
        socket.removeListener("error", onError);
        resolve(new TransportNode(socket));
      });
    });
  }

  /**
   * Constructs a new TransportNode.
   * @param connection - An active Node.js net.Socket connection.
   */
  constructor(connection: Socket) {
    this.socket = connection;

    this.socket.on("error", (err) => {
      console.error("Socket connection error:", err);
      if (!this._closingByUser) {
        this.emitStatus(
          Types.DeviceStatusEnum.DeviceDisconnected,
          "socket-error",
        );
      }
    });

    this.socket.on("close", () => {
      if (this._closingByUser) {
        return; // suppress close-derived disconnect in user flow
      }
      this.emitStatus(
        Types.DeviceStatusEnum.DeviceDisconnected,
        "socket-closed",
      );
    });

    const fromDeviceSource = Readable.toWeb(
      connection,
    ) as ReadableStream<Uint8Array>;
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
          ctrl.close();
        } catch (error) {
          if (!this._closingByUser) {
            this.emitStatus(
              Types.DeviceStatusEnum.DeviceDisconnected,
              "read-error",
            );
          }
          ctrl.error(error instanceof Error ? error : new Error(String(error)));
          try {
            await transformed.cancel();
          } catch {}
        } finally {
          reader.releaseLock();
        }
      },
    });

    // Stream for data going FROM the application TO the Meshtastic device.
    const toDeviceTransform = Utils.toDeviceStream;
    this._toDevice = toDeviceTransform.writable;

    toDeviceTransform.readable
      .pipeTo(Writable.toWeb(connection) as WritableStream<Uint8Array>)
      .catch((err) => {
        console.error("Error piping data to socket:", err);
        const error = err instanceof Error ? err : new Error(String(err));
        this.socket?.destroy(error);
      });
  }

  /** WritableStream to send data to the device. */
  public get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  /** ReadableStream to receive data from the device. */
  public get fromDevice(): ReadableStream<Types.DeviceOutput> {
    return this._fromDevice;
  }

  /**
   * Disconnect from the TCP socket and emit `DeviceDisconnected("user")`.
   * Safe to call multiple times.
   */
  disconnect(): Promise<void> {
    try {
      this._closingByUser = true;
      this.socket?.destroy();
    } finally {
      this.emitStatus(Types.DeviceStatusEnum.DeviceDisconnected, "user");
      this.socket = undefined;
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
