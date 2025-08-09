import type { Types } from "@meshtastic/core";

export class TransportHTTP implements Types.Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<Types.DeviceOutput>;
  private url: string;
  private receiveBatchRequests: boolean;
  private fetchInterval: number;
  private fetching: boolean;
  private interval: ReturnType<typeof setInterval> | undefined;

  public static async create(
    address: string,
    tls?: boolean,
  ): Promise<TransportHTTP> {
    const connectionUrl = `${tls ? "https" : "http"}://${address}`;
    await fetch(`${connectionUrl}/api/v1/toradio`, {
      method: "OPTIONS",
    });
    await Promise.resolve();
    return new TransportHTTP(connectionUrl);
  }

  constructor(url: string) {
    this.url = url;
    this.receiveBatchRequests = false;
    this.fetchInterval = 3000;
    this.fetching = false;

    this._toDevice = new WritableStream<Uint8Array>({
      write: async (chunk) => {
        await this.writeToRadio(chunk);
      },
    });

    let controller: ReadableStreamDefaultController<Types.DeviceOutput>;

    this._fromDevice = new ReadableStream<Types.DeviceOutput>({
      start: (ctrl) => {
        controller = ctrl;
      },
    });

    this.interval = setInterval(async () => {
      if (this.fetching) {
        // We still have the previous request open
        return;
      }
      this.fetching = true;
      try {
        await this.readFromRadio(controller);
      } catch {
        // TODO: Emit disconnection events for certain types of errors
      }
      this.fetching = false;
    }, this.fetchInterval);
  }

  private async readFromRadio(
    controller: ReadableStreamDefaultController<Types.DeviceOutput>,
  ): Promise<void> {
    let readBuffer = new ArrayBuffer(1);
    while (readBuffer.byteLength > 0) {
      const response = await fetch(
        `${this.url}/api/v1/fromradio?all=${
          this.receiveBatchRequests ? "true" : "false"
        }`,
        {
          method: "GET",
          headers: {
            Accept: "application/x-protobuf",
          },
        },
      );

      readBuffer = await response.arrayBuffer();

      if (readBuffer.byteLength > 0) {
        controller.enqueue({
          type: "packet",
          data: new Uint8Array(readBuffer),
        });
      }
    }
  }

  private async writeToRadio(data: Uint8Array): Promise<void> {
    await fetch(`${this.url}/api/v1/toradio`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/x-protobuf",
      },
      body: data,
    });
  }

  get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  get fromDevice(): ReadableStream<Types.DeviceOutput> {
    return this._fromDevice;
  }

  disconnect(): Promise<void> {
    this.fetching = false;
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.interval = undefined;
    return Promise.resolve();
  }
}
