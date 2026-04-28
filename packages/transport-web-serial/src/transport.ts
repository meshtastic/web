import {
  DeviceStatusEnum,
  type DeviceOutput,
  fromDeviceStream,
  toDeviceStream,
  type Transport,
} from "@meshtastic/sdk";
import { Result, type ResultType } from "better-result";

/**
 * Typed error produced when preparing a `SerialPort` for use fails. `kind`
 * lets callers distinguish recoverable cases (port held briefly during
 * USB re-enumeration) from fatal ones (another tab or process owns the
 * port). `userMessage` is a human-readable, actionable string ready for
 * UI without further interpretation.
 */
export class SerialConnectError extends Error {
  public readonly kind: "in-use" | "busy" | "unavailable";
  public readonly userMessage: string;

  constructor(
    kind: SerialConnectError["kind"],
    userMessage: string,
    options?: { cause?: unknown },
  ) {
    super(userMessage, options);
    this.name = "SerialConnectError";
    this.kind = kind;
    this.userMessage = userMessage;
  }
}

const PORT_OPEN_RETRY_DELAYS_MS = [250, 500, 750] as const;
const POST_CLOSE_DELAY_MS = 200;

function isPortBusyError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if ((err as DOMException).name === "InvalidStateError") return true;
  return /already open|failed to open serial port|access is denied/i.test(err.message);
}

/**
 * Provides Web Serial transport for Meshtastic devices.
 *
 * Implements the {@link Transport} contract using the Web Serial API.
 * Use {@link TransportWebSerial.create} or {@link TransportWebSerial.createFromPort}
 * to construct an instance.
 */
export class TransportWebSerial implements Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<DeviceOutput>;
  private fromDeviceController?: ReadableStreamDefaultController<DeviceOutput>;
  private connection: SerialPort;
  private pipePromise: Promise<void> | null = null;
  private abortController: AbortController;
  private portReadable: ReadableStream<Uint8Array>;

  private lastStatus: DeviceStatusEnum = DeviceStatusEnum.DeviceDisconnected;
  private closingByUser = false;

  /**
   * Prompt the user to pick a serial port and open a transport on it.
   * Returns `Err` on permission denial or open failure rather than
   * throwing — callers don't need a try/catch.
   */
  public static async create(
    baudRate?: number,
  ): Promise<ResultType<TransportWebSerial, SerialConnectError>> {
    let port: SerialPort;
    try {
      port = await navigator.serial.requestPort();
    } catch (cause) {
      return Result.err(
        new SerialConnectError("unavailable", "Serial port not selected.", { cause }),
      );
    }
    return TransportWebSerial.createFromPort(port, baudRate);
  }

  /**
   * Open a transport on an already-known {@link SerialPort}. Performs the
   * port-state hygiene needed for reconnect flows:
   *
   * - If `readable` / `writable` are non-null (port still open from a
   *   previous session), close it and wait for the descriptor to settle.
   * - Try `port.open()` up to four times with backoff on
   *   `InvalidStateError` — common during USB re-enumeration.
   *
   * Returns `Err(SerialConnectError)` on persistent failure; the kind
   * distinguishes "port owned by another tab/process" (`in-use`) from
   * "transient busy / could not open" (`busy`) from
   * "permission denied / no streams" (`unavailable`).
   */
  public static async createFromPort(
    port: SerialPort,
    baudRate?: number,
  ): Promise<ResultType<TransportWebSerial, SerialConnectError>> {
    const prep = await TransportWebSerial.preparePort(port, baudRate ?? 115200);
    if (Result.isError(prep)) return Result.err(prep.error);
    try {
      return Result.ok(new TransportWebSerial(port));
    } catch (cause) {
      return Result.err(
        new SerialConnectError(
          "unavailable",
          "Serial port opened but its read / write streams are not accessible. Re-plug the device and try again.",
          { cause },
        ),
      );
    }
  }

  private static async preparePort(
    port: SerialPort,
    baudRate: number,
  ): Promise<ResultType<true, SerialConnectError>> {
    if (port.readable || port.writable) {
      try {
        await port.close();
      } catch (cause) {
        return Result.err(
          new SerialConnectError(
            "in-use",
            "Serial port is open and could not be released. Close any other tab, terminal, or app using it (Arduino IDE, screen, picocom, esptool) and try again.",
            { cause },
          ),
        );
      }
      await new Promise((r) => setTimeout(r, POST_CLOSE_DELAY_MS));
    }

    let lastErr: unknown;
    for (let attempt = 0; attempt <= PORT_OPEN_RETRY_DELAYS_MS.length; attempt++) {
      try {
        await port.open({ baudRate });
        return Result.ok(true);
      } catch (err) {
        lastErr = err;
        if (!isPortBusyError(err) || attempt === PORT_OPEN_RETRY_DELAYS_MS.length) break;
        await new Promise((r) => setTimeout(r, PORT_OPEN_RETRY_DELAYS_MS[attempt]));
      }
    }

    if (isPortBusyError(lastErr)) {
      return Result.err(
        new SerialConnectError(
          "in-use",
          "Serial port is busy. Another tab, terminal, or app is holding it (Arduino IDE, screen, picocom, esptool, Meshtastic CLI). Close it and try again.",
          { cause: lastErr },
        ),
      );
    }
    return Result.err(
      new SerialConnectError(
        "busy",
        "Could not open the serial port. Re-plug the device and try again.",
        { cause: lastErr },
      ),
    );
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
    const toDeviceTransform = toDeviceStream();
    this.pipePromise = toDeviceTransform.readable
      .pipeTo(connection.writable, { signal: this.abortController.signal })
      .catch((err) => {
        // Ignore expected rejection when we cancel it via the AbortController.
        if (abortController.signal.aborted) {
          return;
        }
        console.error("Error piping data to serial port:", err);
        this.connection.close().catch(() => {});
        this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "write-error");
      });

    this._toDevice = toDeviceTransform.writable;

    // Wrap + capture controller to inject status packets
    this._fromDevice = new ReadableStream<DeviceOutput>({
      start: async (ctrl) => {
        this.fromDeviceController = ctrl;

        this.emitStatus(DeviceStatusEnum.DeviceConnecting);

        const transformed = this.portReadable.pipeThrough(fromDeviceStream());
        const reader = transformed.getReader();

        const onOsDisconnect = (ev: Event) => {
          const { port } = ev as unknown as { port?: SerialPort };
          if (port && port === this.connection) {
            this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "serial-disconnected");
          }
        };
        navigator.serial.addEventListener("disconnect", onOsDisconnect);

        this.emitStatus(DeviceStatusEnum.DeviceConnected);

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
            this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "read-error");
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

  /** Readable stream of {@link DeviceOutput} from the device. */
  public get fromDevice(): ReadableStream<DeviceOutput> {
    return this._fromDevice;
  }

  private emitStatus(next: DeviceStatusEnum, reason?: string): void {
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
      this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "user");
      this.closingByUser = false;
    }
  }

  /**
   * Reconnects the transport by creating a new AbortController and re-establishing
   * the pipe connection. Only call this after disconnect() or if the connection failed.
   */
  public async reconnect() {
    this.emitStatus(DeviceStatusEnum.DeviceConnecting, "reconnect");

    try {
      if (!this.connection.readable || !this.connection.writable) {
        throw new Error("Stream not accessible");
      }
      this.portReadable = this.connection.readable;

      // Create a new AbortController for the new connection
      this.abortController = new AbortController();
      const abortController = this.abortController;

      // Re-establish the pipe connection
      const toDeviceTransform = toDeviceStream();
      this.pipePromise = toDeviceTransform.readable
        .pipeTo(this.connection.writable, {
          signal: this.abortController.signal,
        })
        .catch((error) => {
          if (abortController.signal.aborted) {
            return;
          }
          console.error("Error piping data to serial port (reconnect):", error);
          this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "write-error");
        });

      this.emitStatus(DeviceStatusEnum.DeviceConnected, "reconnected");
    } catch (error) {
      // Couldn’t re-pipe
      this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "reconnect-failed");
      throw error;
    }
  }
}
