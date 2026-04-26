import type { DeviceOutput, Transport } from "@meshtastic/sdk";
import { fromDeviceStream, toDeviceStream } from "@meshtastic/sdk";

export class TransportDeno implements Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<DeviceOutput>;
  private connection: Deno.Conn | undefined;

  public static async create(hostname: string): Promise<TransportDeno> {
    const connection = await Deno.connect({
      hostname,
      port: 4403,
    });
    return new TransportDeno(connection);
  }

  constructor(connection: Deno.Conn) {
    this.connection = connection;
    const toStream = toDeviceStream();
    toStream.readable.pipeTo(this.connection.writable);

    this._toDevice = toStream.writable;
    this._fromDevice = this.connection.readable.pipeThrough(fromDeviceStream());
  }

  get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  get fromDevice(): ReadableStream<DeviceOutput> {
    return this._fromDevice;
  }

  disconnect(): Promise<void> {
    this.connection.close();
    this.connection = undefined;
    return Promise.resolve();
  }
}
