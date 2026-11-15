import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { vi } from "vitest";

/**
 * Scripted stand-ins for Web Serial and Web Bluetooth, shaped like the DOM
 * types so they can be handed to code expecting a `SerialPort` or
 * `BluetoothDevice`. A `FakeRadio` answers the SDK handshake so the Kotlin
 * facade reaches `connected`.
 */

const START1 = 0x94;
const START2 = 0xc3;

export function framed(payload: Uint8Array): Uint8Array {
  const frame = new Uint8Array(4 + payload.length);
  frame[0] = START1;
  frame[1] = START2;
  frame[2] = payload.length >> 8;
  frame[3] = payload.length & 0xff;
  frame.set(payload, 4);
  return frame;
}

/** Splits a byte stream into framed payloads, dropping wake bytes and noise. */
export class FrameSplitter {
  private pending: number[] = [];

  feed(chunk: Uint8Array): Uint8Array[] {
    this.pending.push(...chunk);
    const frames: Uint8Array[] = [];
    while (true) {
      const start = this.pending.findIndex(
        (b, i) => b === START1 && this.pending[i + 1] === START2,
      );
      if (start < 0) {
        this.pending = this.pending.slice(-1);
        return frames;
      }
      if (this.pending.length < start + 4) {
        this.pending = this.pending.slice(start);
        return frames;
      }
      const length =
        ((this.pending[start + 2] ?? 0) << 8) | (this.pending[start + 3] ?? 0);
      if (this.pending.length < start + 4 + length) {
        this.pending = this.pending.slice(start);
        return frames;
      }
      frames.push(
        Uint8Array.from(this.pending.slice(start + 4, start + 4 + length)),
      );
      this.pending = this.pending.slice(start + 4 + length);
    }
  }
}

/** Answers `want_config_id` the way firmware does: my_info, then the matching config_complete_id. */
export class FakeRadio {
  readonly received: Protobuf.Mesh.ToRadio[] = [];

  constructor(readonly myNodeNum = 0x0a0b0c0d) {}

  respond(toRadio: Uint8Array): Uint8Array[] {
    const message = fromBinary(Protobuf.Mesh.ToRadioSchema, toRadio);
    this.received.push(message);
    switch (message.payloadVariant.case) {
      case "wantConfigId": {
        const nonce = message.payloadVariant.value;
        return [
          fromRadio({
            case: "myInfo",
            value: create(Protobuf.Mesh.MyNodeInfoSchema, {
              myNodeNum: this.myNodeNum,
            }),
          }),
          fromRadio({
            case: "nodeInfo",
            value: create(Protobuf.Mesh.NodeInfoSchema, {
              num: this.myNodeNum,
              user: { longName: "Fake radio", shortName: "FAKE" },
            }),
          }),
          fromRadio({ case: "configCompleteId", value: nonce }),
        ];
      }
      case "packet":
        return this.answerAdmin(message.payloadVariant.value);
      default:
        return [];
    }
  }

  /** Answers the SDK's `get_owner_request`, which seeds the admin session passkey. */
  private answerAdmin(packet: Protobuf.Mesh.MeshPacket): Uint8Array[] {
    if (
      packet.payloadVariant.case !== "decoded" ||
      packet.payloadVariant.value.portnum !==
        Protobuf.Portnums.PortNum.ADMIN_APP
    ) {
      return [];
    }
    const request = fromBinary(
      Protobuf.Admin.AdminMessageSchema,
      packet.payloadVariant.value.payload,
    );
    if (request.payloadVariant.case !== "getOwnerRequest") {
      return [];
    }
    const response = create(Protobuf.Admin.AdminMessageSchema, {
      sessionPasskey: Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8),
      payloadVariant: {
        case: "getOwnerResponse",
        value: create(Protobuf.Mesh.UserSchema, { longName: "Fake radio" }),
      },
    });
    return [
      fromRadio({
        case: "packet",
        value: create(Protobuf.Mesh.MeshPacketSchema, {
          from: this.myNodeNum,
          to: this.myNodeNum,
          id: packet.id + 1,
          payloadVariant: {
            case: "decoded",
            value: create(Protobuf.Mesh.DataSchema, {
              portnum: Protobuf.Portnums.PortNum.ADMIN_APP,
              payload: toBinary(Protobuf.Admin.AdminMessageSchema, response),
              requestId: packet.id,
            }),
          },
        }),
      }),
    ];
  }
}

function fromRadio(
  payloadVariant: Protobuf.Mesh.FromRadio["payloadVariant"],
): Uint8Array {
  return toBinary(
    Protobuf.Mesh.FromRadioSchema,
    create(Protobuf.Mesh.FromRadioSchema, { payloadVariant }),
  );
}

const noSignals = {
  dataCarrierDetect: false,
  clearToSend: false,
  ringIndicator: false,
  dataSetReady: false,
};

/**
 * A `SerialPort` whose streams exist while open. Bytes written to it go
 * through `radio`, whose replies are pushed back framed.
 */
export class FakeSerialPort extends EventTarget implements SerialPort {
  onconnect = null;
  ondisconnect = null;
  connected = true;
  readable: ReadableStream<Uint8Array> | null = null;
  writable: WritableStream<Uint8Array> | null = null;
  opens = 0;
  closes = 0;
  readonly written: Uint8Array[] = [];
  private reader?: ReadableStreamDefaultController<Uint8Array>;
  private writer?: WritableStreamDefaultController;
  private readonly splitter = new FrameSplitter();

  constructor(
    private readonly info: SerialPortInfo,
    readonly radio?: FakeRadio,
  ) {
    super();
  }

  getInfo(): SerialPortInfo {
    return this.info;
  }

  open(): Promise<void> {
    if (this.readable || this.writable) {
      throw new DOMException("The port is already open.", "InvalidStateError");
    }
    if (!this.connected) {
      return Promise.reject(
        new DOMException("Failed to open serial port.", "NetworkError"),
      );
    }
    this.opens += 1;
    this.readable = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.reader = controller;
      },
    });
    this.writable = new WritableStream<Uint8Array>({
      start: (controller) => {
        this.writer = controller;
      },
      write: (chunk) => {
        this.written.push(chunk);
        for (const payload of this.splitter.feed(chunk)) {
          for (const reply of this.radio?.respond(payload) ?? []) {
            this.push(framed(reply));
          }
        }
      },
    });
    return Promise.resolve();
  }

  close(): Promise<void> {
    if (!this.readable && !this.writable) {
      throw new DOMException(
        "The port is already closed.",
        "InvalidStateError",
      );
    }
    this.closes += 1;
    try {
      this.reader?.close();
    } catch {}
    this.readable = null;
    this.writable = null;
    return Promise.resolve();
  }

  async forget(): Promise<void> {}

  async setSignals(): Promise<void> {}

  async getSignals(): Promise<SerialInputSignals> {
    return noSignals;
  }

  push(bytes: Uint8Array): void {
    this.reader?.enqueue(bytes);
  }

  /**
   * The OS lost the device. As in Chromium, the port stays permitted and
   * keeps its identity, `connected` flips, both streams error with a
   * NetworkError and the getters go null; a later `open()` fails until
   * `replug()`.
   */
  unplug(): void {
    this.connected = false;
    const lost = new DOMException("The device has been lost.", "NetworkError");
    try {
      this.reader?.error(lost);
    } catch {}
    try {
      this.writer?.error(lost);
    } catch {}
    this.readable = null;
    this.writable = null;
  }

  replug(): void {
    this.connected = true;
  }

  /** The device is gone but the OS has not said so yet: only writes fail. */
  failWrites(): void {
    try {
      this.writer?.error(
        new DOMException("The device has been lost.", "NetworkError"),
      );
    } catch {}
  }
}

export class FakeSerial extends EventTarget {
  ports: SerialPort[] = [];
  readonly requestPort = vi.fn((): Promise<SerialPort> => {
    return Promise.reject(new Error("prompted"));
  });

  getPorts(): Promise<SerialPort[]> {
    return Promise.resolve(this.ports);
  }

  dispatch(type: "connect" | "disconnect", port: SerialPort): void {
    const event = new Event(type);
    Object.defineProperty(event, "target", { value: port });
    this.dispatchEvent(event);
  }
}

export function installSerial(ports: SerialPort[] = []): FakeSerial {
  const serial = new FakeSerial();
  serial.ports = ports;
  Object.defineProperty(navigator, "serial", {
    configurable: true,
    value: serial,
  });
  return serial;
}

export function uninstallBrowserDevices(): void {
  Reflect.deleteProperty(navigator, "serial");
  Reflect.deleteProperty(navigator, "bluetooth");
}

const MESH_SERVICE = "6ba1b218-15a8-461f-9fa8-5dcae273eafd";
const TORADIO = "f75c76d2-129e-4dad-a1dd-7866124401e7";
const FROMRADIO = "2c55e69e-4993-11ed-b878-0242ac120002";
const FROMNUM = "ed9da18c-a800-4f66-a670-aa7547e34453";

const noProperties: BluetoothCharacteristicProperties = {
  authenticatedSignedWrites: false,
  broadcast: false,
  indicate: false,
  notify: true,
  read: true,
  reliableWrite: false,
  writableAuxiliaries: false,
  write: true,
  writeWithoutResponse: false,
};

class FakeCharacteristic
  extends EventTarget
  implements BluetoothRemoteGATTCharacteristic
{
  oncharacteristicvaluechanged = () => {};
  readonly properties = noProperties;
  value?: DataView;

  constructor(
    readonly uuid: string,
    readonly service: BluetoothRemoteGATTService,
    private readonly device: FakeBluetoothDevice,
  ) {
    super();
  }

  getDescriptor(): Promise<BluetoothRemoteGATTDescriptor> {
    return Promise.reject(new Error("no descriptors"));
  }

  async getDescriptors(): Promise<BluetoothRemoteGATTDescriptor[]> {
    return [];
  }

  async readValue(): Promise<DataView> {
    const next = this.device.queued.shift();
    return new DataView(next ? next.slice().buffer : new ArrayBuffer(0));
  }

  async writeValue(value: BufferSource): Promise<void> {
    await this.writeValueWithResponse(value);
  }

  async writeValueWithResponse(value: BufferSource): Promise<void> {
    const payload =
      value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    this.device.written.push(payload);
    for (const reply of this.device.radio?.respond(payload) ?? []) {
      this.device.queued.push(reply);
    }
    this.device.notifyFromNum();
  }

  async writeValueWithoutResponse(value: BufferSource): Promise<void> {
    await this.writeValueWithResponse(value);
  }

  async startNotifications(): Promise<BluetoothRemoteGATTCharacteristic> {
    this.device.notifying = true;
    return this;
  }

  async stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic> {
    this.device.notifying = false;
    return this;
  }
}

class FakeService extends EventTarget implements BluetoothRemoteGATTService {
  oncharacteristicvaluechanged = () => {};
  onserviceadded = () => {};
  onservicechanged = () => {};
  onserviceremoved = () => {};
  readonly isPrimary = true;
  readonly characteristics = new Map<string, FakeCharacteristic>();

  constructor(
    readonly uuid: string,
    readonly device: FakeBluetoothDevice,
  ) {
    super();
  }

  async getCharacteristic(
    characteristic: BluetoothCharacteristicUUID,
  ): Promise<BluetoothRemoteGATTCharacteristic> {
    const found = this.characteristics.get(String(characteristic));
    if (!found) throw new Error("no such characteristic");
    return found;
  }

  async getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]> {
    return [...this.characteristics.values()];
  }

  getIncludedService(): Promise<BluetoothRemoteGATTService> {
    return Promise.reject(new Error("no included services"));
  }

  async getIncludedServices(): Promise<BluetoothRemoteGATTService[]> {
    return [];
  }
}

class FakeGattServer implements BluetoothRemoteGATTServer {
  connected = false;

  constructor(
    readonly device: FakeBluetoothDevice,
    private readonly service: FakeService | undefined,
  ) {}

  async connect(): Promise<BluetoothRemoteGATTServer> {
    this.device.connects += 1;
    this.connected = true;
    return this;
  }

  disconnect(): void {
    this.connected = false;
  }

  async getPrimaryService(
    uuid: BluetoothServiceUUID,
  ): Promise<BluetoothRemoteGATTService> {
    if (!this.service || String(uuid) !== this.service.uuid) {
      throw new Error("no such service");
    }
    return this.service;
  }

  async getPrimaryServices(): Promise<BluetoothRemoteGATTService[]> {
    return this.service ? [this.service] : [];
  }
}

/**
 * A `BluetoothDevice` with the Meshtastic GATT service. Writes to `toradio`
 * go through `radio`; replies queue on `fromradio` and a `fromnum`
 * notification announces them.
 */
export class FakeBluetoothDevice
  extends EventTarget
  implements BluetoothDevice
{
  onadvertisementreceived = () => {};
  ongattserverdisconnected = () => {};
  oncharacteristicvaluechanged = () => {};
  onserviceadded = () => {};
  onservicechanged = () => {};
  onserviceremoved = () => {};
  watchingAdvertisements = false;
  connects = 0;
  notifying = false;
  readonly queued: Uint8Array[] = [];
  readonly written: Uint8Array[] = [];
  readonly gatt: FakeGattServer;
  private readonly fromNum: FakeCharacteristic;

  constructor(
    readonly id: string,
    readonly name?: string,
    readonly radio?: FakeRadio,
    hasService = true,
  ) {
    super();
    const service = new FakeService(MESH_SERVICE, this);
    this.fromNum = new FakeCharacteristic(FROMNUM, service, this);
    for (const uuid of [TORADIO, FROMRADIO]) {
      service.characteristics.set(
        uuid,
        new FakeCharacteristic(uuid, service, this),
      );
    }
    service.characteristics.set(FROMNUM, this.fromNum);
    this.gatt = new FakeGattServer(this, hasService ? service : undefined);
  }

  async forget(): Promise<void> {}

  async watchAdvertisements(): Promise<void> {}

  notifyFromNum(): void {
    this.fromNum.dispatchEvent(new Event("characteristicvaluechanged"));
  }

  /** The link dropped: Chrome fires `gattserverdisconnected` on the device. */
  dropLink(): void {
    this.gatt.connected = false;
    this.dispatchEvent(new Event("gattserverdisconnected"));
  }
}

export class FakeBluetooth {
  devices: FakeBluetoothDevice[] = [];
  readonly requestDevice = vi.fn((): Promise<FakeBluetoothDevice> => {
    return Promise.reject(new Error("prompted"));
  });

  getDevices(): Promise<FakeBluetoothDevice[]> {
    return Promise.resolve(this.devices);
  }
}

export function installBluetooth(
  devices: FakeBluetoothDevice[] = [],
): FakeBluetooth {
  const bluetooth = new FakeBluetooth();
  bluetooth.devices = devices;
  Object.defineProperty(navigator, "bluetooth", {
    configurable: true,
    value: bluetooth,
  });
  return bluetooth;
}
