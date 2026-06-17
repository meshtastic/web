import {
  DeviceStatusEnum,
  type DeviceOutput,
  type Transport,
} from "@meshtastic/sdk";

/**
 * Typed error thrown when establishing the GATT connection fails. `kind`
 * lets callers distinguish recoverable transients (BT stack hiccup, device
 * just woke from sleep) from fatal states (out of range, no service).
 *
 * `userMessage` is a human-readable, actionable string suitable for
 * surfacing in UI without further interpretation.
 */
export class BluetoothConnectError extends Error {
  public readonly kind: "transient" | "unavailable" | "missing-service";
  public readonly userMessage: string;

  constructor(
    kind: BluetoothConnectError["kind"],
    userMessage: string,
    options?: { cause?: unknown },
  ) {
    super(userMessage, options);
    this.name = "BluetoothConnectError";
    this.kind = kind;
    this.userMessage = userMessage;
  }
}

function isTransientGattFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if ((err as DOMException).name === "NetworkError") return true;
  return /connection attempt failed|gatt/i.test(err.message);
}

const TRANSIENT_RETRY_DELAY_MS = 750;

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

/**
 * Provides Web Bluetooth transport for Meshtastic devices.
 *
 * Implements the {@link Transport} contract using the Web Bluetooth API.
 * Use {@link TransportWebBluetooth.create} or {@link TransportWebBluetooth.createFromDevice}
 * to construct an instance.
 */
export class TransportWebBluetooth implements Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<DeviceOutput>;
  private fromDeviceController?: ReadableStreamDefaultController<DeviceOutput>;

  private toRadioCharacteristic: BluetoothRemoteGATTCharacteristic;
  private fromRadioCharacteristic: BluetoothRemoteGATTCharacteristic;
  private fromNumCharacteristic: BluetoothRemoteGATTCharacteristic;
  private gattServer: BluetoothRemoteGATTServer;

  private lastStatus: DeviceStatusEnum = DeviceStatusEnum.DeviceDisconnected;

  private closingByUser = false;
  private reading = false;
  /** UUID for the "toRadio" write characteristic. */
  static ToRadioUuid = "f75c76d2-129e-4dad-a1dd-7866124401e7";
  /** UUID for the "fromRadio" read characteristic. */
  static FromRadioUuid = "2c55e69e-4993-11ed-b878-0242ac120002";
  /** UUID for the "fromNum" notification characteristic. */
  static FromNumUuid = "ed9da18c-a800-4f66-a670-aa7547e34453";
  /** UUID for the Meshtastic GATT service. */
  static ServiceUuid = "6ba1b218-15a8-461f-9fa8-5dcae273eafd";

  private onGattDisconnected = () => {
    if (this.closingByUser) {
      return;
    }
    this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "gatt-disconnected");
  };
  private onFromNumChanged = () => {
    void this.readFromRadio();
  };

  /**
   * Prompts the user to select a Bluetooth device, connects it, and returns a transport.
   */
  public static async create(): Promise<TransportWebBluetooth> {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [TransportWebBluetooth.ServiceUuid] }],
    });
    return await TransportWebBluetooth.prepareConnection(device);
  }

  /**
   * Creates a transport from an existing, user-provided {@link BluetoothDevice}.
   */
  public static async createFromDevice(
    device: BluetoothDevice,
  ): Promise<TransportWebBluetooth> {
    return await TransportWebBluetooth.prepareConnection(device);
  }

  /**
   * Prepares and connects to a {@link BluetoothDevice}, resolving its GATT
   * server and characteristics, then returning a transport.
   *
   * Retries the GATT `connect()` call once on transient failures
   * (`NetworkError: Connection attempt failed`) — these are common when
   * the device just woke from sleep or the OS BT stack hiccuped.
   *
   * @throws {BluetoothConnectError} when the GATT connect persistently
   *   fails, the BluetoothDevice has no `gatt`, or the Meshtastic GATT
   *   service / characteristics aren't found on the device.
   */
  public static async prepareConnection(
    device: BluetoothDevice,
  ): Promise<TransportWebBluetooth> {
    const gattServer = await TransportWebBluetooth.connectGatt(device);

    let service: BluetoothRemoteGATTService;
    try {
      service = await gattServer.getPrimaryService(
        TransportWebBluetooth.ServiceUuid,
      );
    } catch (cause) {
      throw new BluetoothConnectError(
        "missing-service",
        "Device does not advertise the Meshtastic GATT service. The firmware may be too old or the device is in another mode.",
        { cause },
      );
    }

    const toRadioCharacteristic = await service.getCharacteristic(
      TransportWebBluetooth.ToRadioUuid,
    );
    const fromRadioCharacteristic = await service.getCharacteristic(
      TransportWebBluetooth.FromRadioUuid,
    );
    const fromNumCharacteristic = await service.getCharacteristic(
      TransportWebBluetooth.FromNumUuid,
    );

    if (
      !toRadioCharacteristic ||
      !fromRadioCharacteristic ||
      !fromNumCharacteristic
    ) {
      throw new BluetoothConnectError(
        "missing-service",
        "Meshtastic GATT characteristics not found on this device.",
      );
    }

    return new TransportWebBluetooth(
      toRadioCharacteristic,
      fromRadioCharacteristic,
      fromNumCharacteristic,
      gattServer,
    );
  }

  private static async connectGatt(
    device: BluetoothDevice,
  ): Promise<BluetoothRemoteGATTServer> {
    if (!device.gatt) {
      throw new BluetoothConnectError(
        "unavailable",
        "Device does not expose a GATT server. Re-pair the device.",
      );
    }
    try {
      const server = await device.gatt.connect();
      if (!server) throw new Error("gatt.connect() returned undefined");
      return server;
    } catch (firstErr) {
      if (!isTransientGattFailure(firstErr)) {
        throw new BluetoothConnectError(
          "unavailable",
          "Bluetooth connection failed. Make sure the device is in range, powered on, and not connected to a phone or another browser tab.",
          { cause: firstErr },
        );
      }
      await new Promise((r) => setTimeout(r, TRANSIENT_RETRY_DELAY_MS));
      try {
        const server = await device.gatt.connect();
        if (!server) throw new Error("gatt.connect() returned undefined");
        return server;
      } catch (retryErr) {
        throw new BluetoothConnectError(
          "transient",
          "Bluetooth connection failed twice. Check the device is in range, powered on, and not paired with a phone or another browser tab. Then click Retry.",
          { cause: retryErr },
        );
      }
    }
  }

  /**
   * Create a transport from resolved GATT characteristics and server.
   * Prefer using the static factory methods instead.
   */
  constructor(
    toRadioCharacteristic: BluetoothRemoteGATTCharacteristic,
    fromRadioCharacteristic: BluetoothRemoteGATTCharacteristic,
    fromNumCharacteristic: BluetoothRemoteGATTCharacteristic,
    gattServer: BluetoothRemoteGATTServer,
  ) {
    this.toRadioCharacteristic = toRadioCharacteristic;
    this.fromRadioCharacteristic = fromRadioCharacteristic;
    this.fromNumCharacteristic = fromNumCharacteristic;
    this.gattServer = gattServer;

    this._fromDevice = new ReadableStream<DeviceOutput>({
      start: async (ctrl) => {
        this.fromDeviceController = ctrl;
        this.emitStatus(DeviceStatusEnum.DeviceConnecting);

        this.gattServer.device.addEventListener(
          "gattserverdisconnected",
          this.onGattDisconnected,
        );

        try {
          await this.fromNumCharacteristic.startNotifications();
          this.fromNumCharacteristic.addEventListener(
            "characteristicvaluechanged",
            this.onFromNumChanged,
          );
          this.emitStatus(DeviceStatusEnum.DeviceConnected);
          // prime once in case data already queued
          void this.readFromRadio();
        } catch {
          this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "notify-failed");
          this.gattServer.device.removeEventListener(
            "gattserverdisconnected",
            this.onGattDisconnected,
          );
        }
      },
    });

    this._toDevice = new WritableStream<Uint8Array>({
      write: async (chunk) => {
        try {
          const ab = toArrayBuffer(chunk);
          await this.toRadioCharacteristic.writeValue(ab);
          void this.readFromRadio(); // ensure we read any response
        } catch (error) {
          this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "write-error");
          throw error;
        }
      },
    });
  }

  /** Writable stream of bytes to the device. */
  get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  /** Readable stream of {@link DeviceOutput} from the device. */
  get fromDevice(): ReadableStream<DeviceOutput> {
    return this._fromDevice;
  }

  /**
   * Closes the GATT connection and emits `DeviceDisconnected("user")`.
   */
  disconnect(): Promise<void> {
    try {
      this.closingByUser = true;
      this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "user");
      try {
        this.fromNumCharacteristic.stopNotifications?.();
      } catch {}
      this.fromNumCharacteristic.removeEventListener(
        "characteristicvaluechanged",
        this.onFromNumChanged,
      );
      this.gattServer.device.removeEventListener(
        "gattserverdisconnected",
        this.onGattDisconnected,
      );

      this.gattServer.disconnect();
    } finally {
      this.closingByUser = false;
    }
    return Promise.resolve();
  }

  private async readFromRadio(): Promise<void> {
    if (this.reading) {
      return;
    }
    this.reading = true;

    try {
      let hasMoreData = true;
      while (hasMoreData && this.fromRadioCharacteristic) {
        const value = await this.fromRadioCharacteristic.readValue();
        if (value.byteLength === 0) {
          hasMoreData = false;
          continue;
        }
        this.enqueue({
          type: "packet",
          data: new Uint8Array(value.buffer),
        });
      }
    } catch (error) {
      if (!this.closingByUser) {
        this.emitStatus(DeviceStatusEnum.DeviceDisconnected, "read-error");
      }
      throw error;
    } finally {
      this.reading = false;
    }
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

  private enqueue(output: DeviceOutput): void {
    this.fromDeviceController?.enqueue(output);
  }
}
