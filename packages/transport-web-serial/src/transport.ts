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
  private fromDeviceController?: ReadableStreamDefaultController<Types.DeviceOutput>;
  private connection: SerialPort;
  private pipePromise: Promise<void> | null = null;
  private abortController: AbortController;
  private portReadable: ReadableStream<Uint8Array>;

  private lastStatus: Types.DeviceStatusEnum =
    Types.DeviceStatusEnum.DeviceDisconnected;
  private closingByUser = false;

  /**
   * Create a new TransportWebSerial instance using a serial port.
   */
  public static async create(baudRate?: number): Promise<TransportWebSerial> {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: baudRate || 115200 });
    await TransportWebSerial.sendWakeBytes(port);
    return new TransportWebSerial(port);
  }

  /**
   * Creates a new TransportWebSerial instance from an existing, provided {@link SerialPort}.
   * Opens it if not already open.
   */
  public static async createFromPort(
    port: SerialPort,
    baudRate?: number,
  ): Promise<TransportWebSerial> {
    const streamsLocked = port.readable?.locked || port.writable?.locked;

    if (streamsLocked) {
      // Streams locked from a previous connection — close and reopen
      try {
        await port.close();
      } catch {
        /* port.close() releases locks internally */
      }
    }

    if (!port.readable || !port.writable) {
      await port.open({ baudRate: baudRate || 115200 });
    }

    await TransportWebSerial.sendWakeBytes(port);
    return new TransportWebSerial(port);
  }

  /**
   * Sends wake bytes to rouse a sleeping device before establishing streams.
   * Must be called before the constructor, which locks the writable stream via pipeTo().
   */
  private static async sendWakeBytes(port: SerialPort): Promise<void> {
    if (!port.writable || port.writable.locked) return;
    const writer = port.writable.getWriter();
    try {
      await writer.write(new Uint8Array([0x94, 0x94, 0x94, 0x94]));
    } finally {
      writer.releaseLock();
    }
  }

  /**
   * Constructs a transport around a given {@link SerialPort}.
   * @throws If the port lacks readable or writable streams.
   */
  constructor(connection: SerialPort) {
    if (!connection.readable || !connection.writable) {
      throw new Error("Stream not accessible");
    }

    this.connection = connection;
    this.portReadable = connection.readable;
    this.abortController = new AbortController();
    const abortController = this.abortController;

    console.debug("[Serial] Setting up transport streams");

    const toDeviceTransform = Utils.toDeviceStream();
    this.pipePromise = toDeviceTransform.readable
      .pipeTo(connection.writable, { signal: this.abortController.signal })
      .catch((err) => {
        if (abortController.signal.aborted) {
          return;
        }
        console.error("[Serial] Error piping data to serial port:", err);
        this.connection.close().catch(() => {});
        this.emitStatus(
          Types.DeviceStatusEnum.DeviceDisconnected,
          "write-error",
        );
      });

    this._toDevice = toDeviceTransform.writable;

    this._fromDevice = new ReadableStream<Types.DeviceOutput>({
      start: async (ctrl) => {
        this.fromDeviceController = ctrl;

        console.debug("[Serial] Starting read loop");
        this.emitStatus(Types.DeviceStatusEnum.DeviceConnecting);

        const transformed = this.portReadable.pipeThrough(
          Utils.fromDeviceStream(),
        );
        const reader = transformed.getReader();

        const onOsDisconnect = (ev: Event) => {
          const { port } = ev as unknown as { port?: SerialPort };
          if (port && port === this.connection) {
            this.emitStatus(
              Types.DeviceStatusEnum.DeviceDisconnected,
              "serial-disconnected",
            );
          }
        };
        navigator.serial.addEventListener("disconnect", onOsDisconnect);

        this.emitStatus(Types.DeviceStatusEnum.DeviceConnected);
        console.debug("[Serial] Connected, waiting for data...");

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              console.debug("[Serial] Read stream done");
              break;
            }
            ctrl.enqueue(value);
          }
          ctrl.close();
        } catch (error) {
          console.error("[Serial] Read error:", error);
          if (!this.closingByUser) {
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
          navigator.serial.removeEventListener("disconnect", onOsDisconnect);
        }
      },
    });
  }

  /** Writable stream of bytes to the device. */
  public get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  /** Readable stream of {@link Types.DeviceOutput} from the device. */
  public get fromDevice(): ReadableStream<Types.DeviceOutput> {
    return this._fromDevice;
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

  /**
   * Closes the serial port and emits `DeviceDisconnected("user")`.
   */
  public async disconnect(): Promise<void> {
    try {
      this.closingByUser = true;

      this.abortController.abort();
      if (this.pipePromise) {
        await this.pipePromise;
      }

      if (this._fromDevice?.locked) {
        try {
          await this._fromDevice.cancel();
        } catch {}
      }

      await this.connection.close();
    } catch (error) {
      console.warn("Could not cleanly disconnect serial port:", error);
    } finally {
      this.emitStatus(Types.DeviceStatusEnum.DeviceDisconnected, "user");
      this.closingByUser = false;
    }
  }
}
