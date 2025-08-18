import { Types } from "@meshtastic/core";

const FETCH_INTERVAL_MS = 3000;
const READ_TIMEOUT_MS = 7000;
const WRITE_TIMEOUT_MS = 4000;

function toArrayBuffer(uint8array: Uint8Array): ArrayBuffer {
  if (
    uint8array.buffer instanceof ArrayBuffer &&
    uint8array.byteOffset === 0 &&
    uint8array.byteLength === uint8array.buffer.byteLength
  ) {
    return uint8array.buffer;
  }
  return uint8array.slice().buffer;
}

function createTimeoutController(ms: number): {
  controller: AbortController;
  clear: () => void;
} {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  const clear = () => clearTimeout(id);
  return { controller, clear };
}

function composeAbortSignals(
  a: AbortSignal,
  b: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const abortIfNeeded = () => controller.abort();

  if (a.aborted || b.aborted) {
    controller.abort();
  }

  a.addEventListener("abort", abortIfNeeded);
  b.addEventListener("abort", abortIfNeeded);

  const cleanup = () => {
    a.removeEventListener("abort", abortIfNeeded);
    b.removeEventListener("abort", abortIfNeeded);
  };

  return { signal: controller.signal, cleanup };
}

/**
 * Provides HTTP(S) transport for Meshtastic devices.
 *
 * Implements {@link Types.Transport} using the device's HTTP API.
 * Polls `/api/v1/fromradio` for incoming packets and writes to `/api/v1/toradio`.
 */
export class TransportHTTP implements Types.Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<Types.DeviceOutput>;
  private _fromDeviceController?: ReadableStreamDefaultController<Types.DeviceOutput>;

  private url: string;
  private receiveBatchRequests: boolean;
  private fetchInterval: number;
  private fetching: boolean;
  private interval: ReturnType<typeof setInterval> | undefined;

  private _inflightReadController?: AbortController;
  private _inflightReadStartedAt = 0;

  private _lastStatus: Types.DeviceStatusEnum =
    Types.DeviceStatusEnum.DeviceDisconnected;
  private _closingByUser = false;

  /**
   * Probe the device and return a connected HTTP transport.
   *
   * @param address Hostname or IP address (with optional port).
   * @param tls Use HTTPS if true, HTTP otherwise.
   */
  public static async create(
    address: string,
    tls?: boolean,
  ): Promise<TransportHTTP> {
    const connectionUrl = `${tls ? "https" : "http"}://${address}`;
    await fetch(`${connectionUrl}/api/v1/toradio`, {
      method: "OPTIONS",
    });
    return new TransportHTTP(connectionUrl);
  }

  /**
   * Construct a new HTTP transport for the given device URL.
   *
   * @param url Base URL of the device (`http://host:port` or `https://host:port`).
   */
  constructor(url: string) {
    this.url = url;
    this.receiveBatchRequests = false;
    this.fetchInterval = FETCH_INTERVAL_MS;
    this.fetching = false;

    this._toDevice = new WritableStream<Uint8Array>({
      write: async (chunk) => {
        try {
          await this.writeToRadio(chunk);
        } catch (error) {
          if (!this._closingByUser) {
            this.emitStatus(
              Types.DeviceStatusEnum.DeviceDisconnected,
              error instanceof DOMException && error.name === "AbortError"
                ? "write-timeout"
                : "write-error",
            );
          }
          throw error;
        }
      },
    });

    this._fromDevice = new ReadableStream<Types.DeviceOutput>({
      start: (ctrl) => {
        this._fromDeviceController = ctrl;
        this.emitStatus(Types.DeviceStatusEnum.DeviceConnecting);
      },
      cancel: () => {
        if (this.interval) {
          clearInterval(this.interval);
        }
        this.interval = undefined;
      },
    });

    this.interval = setInterval(async () => {
      if (this.fetching) {
        if (
          this._inflightReadController &&
          Date.now() - this._inflightReadStartedAt > READ_TIMEOUT_MS + 250
        ) {
          try {
            this._inflightReadController.abort();
          } catch {}
        }
        return;
      }

      this.fetching = true;
      try {
        await this.readFromRadio();
      } catch (error) {
        if (!this._closingByUser) {
          this.emitStatus(
            Types.DeviceStatusEnum.DeviceDisconnected,
            error instanceof DOMException && error.name === "AbortError"
              ? "read-timeout"
              : "read-error",
          );
        }
      } finally {
        this.fetching = false;
      }
    }, this.fetchInterval);
  }

  /** Poll `/api/v1/fromradio` and enqueue incoming packets. */
  private async readFromRadio(): Promise<void> {
    let readBuffer = new ArrayBuffer(1);

    while (readBuffer.byteLength > 0) {
      const inflight = new AbortController();
      this._inflightReadController = inflight;
      this._inflightReadStartedAt = Date.now();

      const { controller: timeoutCtrl, clear } =
        createTimeoutController(READ_TIMEOUT_MS);

      const { signal, cleanup } = composeAbortSignals(
        inflight.signal,
        timeoutCtrl.signal,
      );

      try {
        const response = await fetch(
          `${this.url}/api/v1/fromradio?all=${this.receiveBatchRequests ? "true" : "false"}`,
          {
            method: "GET",
            headers: { Accept: "application/x-protobuf" },
            signal,
          },
        );
        if (!response.ok) {
          throw new Error(
            `fromradio ${response.status} ${response.statusText}`,
          );
        }

        if (this._lastStatus === Types.DeviceStatusEnum.DeviceDisconnected) {
          this.emitStatus(Types.DeviceStatusEnum.DeviceConnected);
        }

        readBuffer = await response.arrayBuffer();

        if (readBuffer.byteLength > 0) {
          this._fromDeviceController?.enqueue({
            type: "packet",
            data: new Uint8Array(readBuffer),
          });
        }
      } finally {
        cleanup();
        clear();
        this._inflightReadController = undefined;
      }
    }
  }

  /** Write a protobuf-encoded request to `/api/v1/toradio`. */
  private async writeToRadio(data: Uint8Array): Promise<void> {
    const { controller: timeoutCtrl, clear } =
      createTimeoutController(WRITE_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.url}/api/v1/toradio`, {
        method: "PUT",
        headers: { "Content-Type": "application/x-protobuf" },
        body: toArrayBuffer(data),
        signal: timeoutCtrl.signal,
      });
      if (!response.ok) {
        throw new Error(`toradio ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if (!this._closingByUser) {
        this.emitStatus(
          Types.DeviceStatusEnum.DeviceDisconnected,
          error instanceof DOMException && error.name === "AbortError"
            ? "write-timeout"
            : "write-error",
        );
      }
      throw error;
    } finally {
      clear();
    }
  }

  /** Writable stream of bytes to the device. */
  get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  /** Readable stream of {@link Types.DeviceOutput} from the device. */
  get fromDevice(): ReadableStream<Types.DeviceOutput> {
    return this._fromDevice;
  }

  /**
   * Stop polling and emit `DeviceDisconnected("user")`.
   */
  disconnect(): Promise<void> {
    this._closingByUser = true;

    if (this.interval) {
      clearInterval(this.interval);
    }
    this.interval = undefined;
    this.fetching = false;

    try {
      this._inflightReadController?.abort();
    } catch {}
    this._inflightReadController = undefined;

    this.emitStatus(Types.DeviceStatusEnum.DeviceDisconnected, "user");

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
