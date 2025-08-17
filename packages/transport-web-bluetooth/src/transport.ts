import { Types } from "@meshtastic/core";

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
 * Implements the {@link Types.Transport} contract using the Web Bluetooth API.
 * Use {@link TransportWebBluetooth.create} or {@link TransportWebBluetooth.createFromDevice}
 * to construct an instance.
 */
export class TransportWebBluetooth implements Types.Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<Types.DeviceOutput>;
  private _fromDeviceController?: ReadableStreamDefaultController<Types.DeviceOutput>;
  private _isFirstWrite = true;

  private toRadioCharacteristic: BluetoothRemoteGATTCharacteristic;
  private fromRadioCharacteristic: BluetoothRemoteGATTCharacteristic;
  private fromNumCharacteristic: BluetoothRemoteGATTCharacteristic;
  private gattServer: BluetoothRemoteGATTServer;

  private _lastStatus: Types.DeviceStatusEnum =
    Types.DeviceStatusEnum.DeviceDisconnected;

  private _closingByUser = false;

  /** UUID for the "toRadio" write characteristic. */
  static ToRadioUuid = "f75c76d2-129e-4dad-a1dd-7866124401e7";
  /** UUID for the "fromRadio" read characteristic. */
  static FromRadioUuid = "2c55e69e-4993-11ed-b878-0242ac120002";
  /** UUID for the "fromNum" notification characteristic. */
  static FromNumUuid = "ed9da18c-a800-4f66-a670-aa7547e34453";
  /** UUID for the Meshtastic GATT service. */
  static ServiceUuid = "6ba1b218-15a8-461f-9fa8-5dcae273eafd";

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
   * Prepares and connects to a {@link BluetoothDevice}, resolving its GATT server
   * and characteristics, then returning a transport.
   *
   * @throws if required services or characteristics are missing.
   */
  public static async prepareConnection(
    device: BluetoothDevice,
  ): Promise<TransportWebBluetooth> {
    const gattServer = await device.gatt?.connect();
    if (!gattServer) {
      throw new Error("Failed to connect to GATT server");
    }

    const service = await gattServer.getPrimaryService(
      TransportWebBluetooth.ServiceUuid,
    );
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
      throw new Error("Failed to find required characteristics");
    }

    return new TransportWebBluetooth(
      toRadioCharacteristic,
      fromRadioCharacteristic,
      fromNumCharacteristic,
      gattServer,
    );
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

    this._fromDevice = new ReadableStream<Types.DeviceOutput>({
      start: (ctrl) => {
        this._fromDeviceController = ctrl;
        this.emitStatus(Types.DeviceStatusEnum.DeviceConnecting);

        this.gattServer.device.addEventListener(
          "gattserverdisconnected",
          () => {
            if (this._closingByUser) {
              return;
            }
            this.emitStatus(
              Types.DeviceStatusEnum.DeviceDisconnected,
              "gatt-disconnected",
            );
          },
        );
      },
    });

    this._toDevice = new WritableStream<Uint8Array>({
      write: async (chunk) => {
        try {
          const ab = toArrayBuffer(chunk);
          await this.toRadioCharacteristic.writeValue(ab);

          if (this._isFirstWrite) {
            this._isFirstWrite = false;
            setTimeout(() => this.readFromRadio(), 50);
          }
        } catch (error) {
          this.emitStatus(
            Types.DeviceStatusEnum.DeviceDisconnected,
            "write-error",
          );
          throw error;
        }
      },
    });

    this.fromNumCharacteristic.addEventListener(
      "characteristicvaluechanged",
      () => {
        this.readFromRadio();
      },
    );

    this.fromNumCharacteristic
      .startNotifications()
      .then(() => {
        this.emitStatus(Types.DeviceStatusEnum.DeviceConnected);
      })
      .catch(() => {
        this.emitStatus(
          Types.DeviceStatusEnum.DeviceDisconnected,
          "notify-failed",
        );
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

  /**
   * Closes the GATT connection and emits `DeviceDisconnected("user")`.
   */
  disconnect(): Promise<void> {
    try {
      this._closingByUser = true;
      this.gattServer.disconnect();
    } finally {
      this.emitStatus(Types.DeviceStatusEnum.DeviceDisconnected, "user");
      this._closingByUser = false;
    }
    return Promise.resolve();
  }

  private async readFromRadio(): Promise<void> {
    const controller = this._fromDeviceController;
    if (!controller) {
      return;
    }

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
    } catch {
      this.emitStatus(Types.DeviceStatusEnum.DeviceDisconnected, "read-error");
    }
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

  private enqueue(output: Types.DeviceOutput): void {
    this._fromDeviceController?.enqueue(output);
  }
}
