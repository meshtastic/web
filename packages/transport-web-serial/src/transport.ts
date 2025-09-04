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
    if (!port.readable || !port.writable) {
      await port.open({ baudRate: baudRate || 115200 });
    }
    return new TransportWebSerial(port);
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

    // Set up the pipe with abort signal for clean cancellation
    const toDeviceTransform = Utils.toDeviceStream();
    this.pipePromise = toDeviceTransform.readable
      .pipeTo(connection.writable, { signal: this.abortController.signal })
      .catch((err) => {
        // Ignore expected rejection when we cancel it via the AbortController.
        if (abortController.signal.aborted) {
          return;
        }
        console.error("Error piping data to serial port:", err);
        this.connection.close().catch(() => {});
        this.emitStatus(
          Types.DeviceStatusEnum.DeviceDisconnected,
          "write-error",
        );
      });

    this._toDevice = toDeviceTransform.writable;

    // Wrap + capture controller to inject status packets
    this._fromDevice = new ReadableStream<Types.DeviceOutput>({
      start: async (ctrl) => {
        this.fromDeviceController = ctrl;

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

      // Stop outbound piping
      this.abortController.abort();
      if (this.pipePromise) {
        await this.pipePromise;
      }

      // Cancel any remaining streams
      if (this._fromDevice?.locked) {
        try {
          await this._fromDevice.cancel();
        } catch {
          // Stream cancellation might fail if already cancelled
        }
      }

      await this.connection.close();
    } catch (error) {
      // If we can't close cleanly, let the browser handle cleanup
      console.warn("Could not cleanly disconnect serial port:", error);
    } finally {
      this.emitStatus(Types.DeviceStatusEnum.DeviceDisconnected, "user");
      this.closingByUser = false;
    }
  }

  /**
   * Reconnects the transport by creating a new AbortController and re-establishing
   * the pipe connection. Only call this after disconnect() or if the connection failed.
   */
  public async reconnect() {
    this.emitStatus(Types.DeviceStatusEnum.DeviceConnecting, "reconnect");

    try {
      if (!this.connection.readable || !this.connection.writable) {
        throw new Error("Stream not accessible");
      }
      this.portReadable = this.connection.readable;

      // Create a new AbortController for the new connection
      this.abortController = new AbortController();
      const abortController = this.abortController;

      // Re-establish the pipe connection
      const toDeviceTransform = Utils.toDeviceStream();
      this.pipePromise = toDeviceTransform.readable
        .pipeTo(this.connection.writable, {
          signal: this.abortController.signal,
        })
        .catch((error) => {
          if (abortController.signal.aborted) {
            return;
          }
          console.error("Error piping data to serial port (reconnect):", error);
          this.emitStatus(
            Types.DeviceStatusEnum.DeviceDisconnected,
            "write-error",
          );
        });

      this.emitStatus(Types.DeviceStatusEnum.DeviceConnected, "reconnected");
    } catch (error) {
      // Couldn’t re-pipe
      this.emitStatus(
        Types.DeviceStatusEnum.DeviceDisconnected,
        "reconnect-failed",
      );
      throw error;
    }
  }
}
