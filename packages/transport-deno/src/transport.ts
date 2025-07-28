import type { Types } from "@meshtastic/core";
import { Utils } from "@meshtastic/core";

export class TransportDeno implements Types.Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<Types.DeviceOutput>;

  public static async create(hostname: string): Promise<TransportDeno> {
    const connection = await Deno.connect({
      hostname,
      port: 4403,
    });
    return new TransportDeno(connection);
  }

  constructor(connection: Deno.Conn) {
    Utils.toDeviceStream.readable.pipeTo(connection.writable);

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
}
