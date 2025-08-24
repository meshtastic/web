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
  private fromDeviceController?: ReadableStreamDefaultController<Types.DeviceOutput>;
  private socket: Socket | undefined;
  private pipePromise?: Promise<void>;
  private abortController: AbortController;
  private lastStatus: Types.DeviceStatusEnum =
    Types.DeviceStatusEnum.DeviceDisconnected;

  private closingByUser = false;

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
      if (!this.closingByUser) {
        this.emitStatus(
          Types.DeviceStatusEnum.DeviceDisconnected,
          "socket-error",
        );
      }
    });

    this.socket.on("close", () => {
      if (this.closingByUser) {
        return; // suppress close-derived disconnect in user flow
      }
      this.emitStatus(
        Types.DeviceStatusEnum.DeviceDisconnected,
        "socket-closed",
      );
    });

    this.abortController = new AbortController();
    const abortController = this.abortController;

    const fromDeviceSource = Readable.toWeb(
      connection,
    ) as ReadableStream<Uint8Array>;
    const transformed = fromDeviceSource.pipeThrough(Utils.fromDeviceStream());

    this._fromDevice = new ReadableStream<Types.DeviceOutput>({
      start: async (ctrl) => {
        this.fromDeviceController = ctrl;

        this.emitStatus(Types.DeviceStatusEnum.DeviceConnecting);
        this.emitStatus(Types.DeviceStatusEnum.DeviceConnected);

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
            ctrl.close();
          } else {
            this.emitStatus(
              Types.DeviceStatusEnum.DeviceDisconnected,
              "read-error",
            );

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
    const toDeviceTransform = Utils.toDeviceStream;
    this._toDevice = toDeviceTransform.writable;

    this.pipePromise = toDeviceTransform.readable
      .pipeTo(Writable.toWeb(connection) as WritableStream<Uint8Array>, {
        signal: abortController.signal,
      })
      .catch((err) => {
        if (abortController.signal.aborted) {
          return;
        }
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
  async disconnect(): Promise<void> {
    try {
      this.closingByUser = true;
      this.emitStatus(Types.DeviceStatusEnum.DeviceDisconnected, "user");

      this.abortController.abort();
      if (this.pipePromise) {
        await this.pipePromise;
      }

      this.socket?.destroy();
    } finally {
      this.socket = undefined;
      this.closingByUser = false;
    }
  }

  private emitStatus(next: Types.DeviceStatusEnum, reason?: string): void {
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
