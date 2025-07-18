import { Socket } from "node:net";
import { Readable, Writable } from "node:stream";
import { Utils } from "@meshtastic/core";
import type { Types } from "@meshtastic/core";

export class TransportNode implements Types.Transport {
  private readonly _toDevice: WritableStream<Uint8Array>;
  private readonly _fromDevice: ReadableStream<Types.DeviceOutput>;

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
    connection.on("error", (err) => {
      console.error("Socket connection error:", err);
    });

    const fromDeviceSource = Readable.toWeb(
      connection,
    ) as ReadableStream<Uint8Array>;
    this._fromDevice = fromDeviceSource.pipeThrough(Utils.fromDeviceStream());

		// Stream for data going FROM the application TO the Meshtastic device.
		const toDeviceTransform = Utils.toDeviceStream;
		this._toDevice = toDeviceTransform.writable;

    // The readable end of the transform is then piped to the Node.js socket.
    // A similar assertion is needed here because `Writable.toWeb` also returns
    // a generically typed stream (`WritableStream<any>`).
    toDeviceTransform.readable
      .pipeTo(Writable.toWeb(connection) as WritableStream<Uint8Array>)
      .catch((err) => {
        console.error("Error piping data to socket:", err);
        connection.destroy(err as Error);
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
}
