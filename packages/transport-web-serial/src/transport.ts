import { Types, Utils } from "@meshtastic/core";

/**
 * Provides Web Serial transport for Meshtastic devices.
 *
 * Implements the {@link Types.Transport} contract using the Web Serial API.
 * Use {@link TransportWebSerial.create} or {@link TransportWebSerial.createFromPort}
 * to construct an instance.
 */
export class TransportWebSerial implements Types.Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<Types.DeviceOutput>;
  private _fromDeviceController?: ReadableStreamDefaultController<Types.DeviceOutput>;

  private connection: SerialPort;
  private _portReadable: ReadableStream<Uint8Array>;
  private _portWritable: WritableStream<Uint8Array>;

  private _lastStatus: Types.DeviceStatusEnum =
    Types.DeviceStatusEnum.DeviceDisconnected;
  private _closingByUser = false;

  /**
   * Prompts the user to select a serial port, opens it, and returns a transport.
   */
  public static async create(baudRate?: number): Promise<TransportWebSerial> {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: baudRate || 115200 });
    return new TransportWebSerial(port);
  }

  /**
   * Creates a transport from an existing, user-provided {@link SerialPort}.
   */
  public static async createFromPort(
    port: SerialPort,
    baudRate?: number,
  ): Promise<TransportWebSerial> {
    await port.open({ baudRate: baudRate || 115200 });
    return new TransportWebSerial(port);
  }

  /**
   * Constructs a transport around a given {@link SerialPort}.
   * @throws If the port lacks readable or writable streams.
   */
  constructor(connection: SerialPort) {
    const readable = connection.readable;
    const writable = connection.writable;
    if (!readable || !writable) {
      throw new Error("Stream not accessible");
    }

    this.connection = connection;
    this._portReadable = readable;
    this._portWritable = writable;

    Utils.toDeviceStream.readable.pipeTo(this._portWritable);
    this._toDevice = Utils.toDeviceStream.writable;

    this._fromDevice = new ReadableStream<Types.DeviceOutput>({
      start: async (ctrl) => {
        this._fromDeviceController = ctrl;

        this.emitStatus(Types.DeviceStatusEnum.DeviceConnecting);

        const transformed = this._portReadable.pipeThrough(
          Utils.fromDeviceStream(),
        );
        const reader = transformed.getReader();

        const onOsDisconnect = (ev: Event) => {
          const { port } = ev as unknown as { port?: SerialPort };
          if (port && port === this.connection) {
            if (this._closingByUser) {
              return;
            }
            this.emitStatus(
              Types.DeviceStatusEnum.DeviceDisconnected,
              "serial-disconnected",
            );
          }
        };
        navigator.serial.addEventListener("disconnect", onOsDisconnect);

        this.emitStatus(Types.DeviceStatusEnum.DeviceConnected);

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
          navigator.serial.removeEventListener("disconnect", onOsDisconnect);
        }
      },
    });
  }

  /** Writable stream of bytes to the device. */
  get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  /** Readable stream of {@link Types.DeviceOutput} from the device. */
  get fromDevice(): ReadableStream<Types.DeviceOutput> {
    return this._fromDevice;
  }

  private enqueue(output: Types.DeviceOutput): void {
    this._fromDeviceController?.enqueue(output);
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

  /**
   * Closes the serial port and emits `DeviceDisconnected("user")`.
   */
  async disconnect(): Promise<void> {
    try {
      this._closingByUser = true;
      await this.connection.close();
    } finally {
      this.emitStatus(Types.DeviceStatusEnum.DeviceDisconnected, "user");
      this._closingByUser = false;
    }
  }
}
