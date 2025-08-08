import type { Types } from "@meshtastic/core";

export class TransportWebBluetooth implements Types.Transport {
  private _toDevice: WritableStream<Uint8Array>;
  private _fromDevice: ReadableStream<Types.DeviceOutput>;
  private _fromDeviceController?: ReadableStreamDefaultController<Types.DeviceOutput>;
  private _isFirstWrite = true;

  private toRadioCharacteristic: BluetoothRemoteGATTCharacteristic;
  private fromRadioCharacteristic: BluetoothRemoteGATTCharacteristic;
  private fromNumCharacteristic: BluetoothRemoteGATTCharacteristic;
  private gattServer: BluetoothRemoteGATTServer;

  static ToRadioUuid = "f75c76d2-129e-4dad-a1dd-7866124401e7";
  static FromRadioUuid = "2c55e69e-4993-11ed-b878-0242ac120002";
  static FromNumUuid = "ed9da18c-a800-4f66-a670-aa7547e34453";
  static ServiceUuid = "6ba1b218-15a8-461f-9fa8-5dcae273eafd";

  public static async create(): Promise<TransportWebBluetooth> {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [TransportWebBluetooth.ServiceUuid] }],
    });
    return await TransportWebBluetooth.prepareConnection(device);
  }

  public static async createFromDevice(
    device: BluetoothDevice,
  ): Promise<TransportWebBluetooth> {
    return await TransportWebBluetooth.prepareConnection(device);
  }

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

    console.log("Connected to device", device.name);

    return new TransportWebBluetooth(
      toRadioCharacteristic,
      fromRadioCharacteristic,
      fromNumCharacteristic,
      gattServer,
    );
  }

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

    this._fromDevice = new ReadableStream({
      start: (ctrl) => {
        this._fromDeviceController = ctrl;
      },
    });

    this._toDevice = new WritableStream({
      write: async (chunk) => {
        await this.toRadioCharacteristic.writeValue(chunk);

        if (this._isFirstWrite && this._fromDeviceController) {
          this._isFirstWrite = false;

          setTimeout(() => {
            this.readFromRadio(this._fromDeviceController!);
          }, 50);
        }
      },
    });

    this.fromNumCharacteristic.addEventListener(
      "characteristicvaluechanged",
      () => {
        if (this._fromDeviceController) {
          this.readFromRadio(this._fromDeviceController);
        }
      },
    );

    this.fromNumCharacteristic.startNotifications();
  }

  get toDevice(): WritableStream<Uint8Array> {
    return this._toDevice;
  }

  get fromDevice(): ReadableStream<Types.DeviceOutput> {
    return this._fromDevice;
  }

  protected async readFromRadio(
    controller: ReadableStreamDefaultController<Types.DeviceOutput>,
  ): Promise<void> {
    let hasMoreData = true;
    while (hasMoreData && this.fromRadioCharacteristic) {
      const value = await this.fromRadioCharacteristic.readValue();
      if (value.byteLength === 0) {
        hasMoreData = false;
        continue;
      }
      controller.enqueue({
        type: "packet",
        data: new Uint8Array(value.buffer),
      });
    }
  }

  disconnect(): Promise<void> {
    this.gattServer.disconnect();
    return Promise.resolve();
  }
}
