import { Types, Utils } from "@meshtastic/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runTransportContract } from "../../../tests/utils/transportContract.ts";
import { TransportWebSerial } from "./transport.ts";

function stubCoreTransforms() {
  const toDevice = () =>
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
    });

  // maps raw bytes -> DeviceOutput.packet
  const fromDeviceFactory = () =>
    new TransformStream<Uint8Array, Types.DeviceOutput>({
      transform(chunk, controller) {
        controller.enqueue({ type: "packet", data: chunk });
      },
    });

  const transform = Utils.toDeviceStream;
  const restoreTo = vi
    .spyOn(Utils, "toDeviceStream", "get")
    .mockReturnValue(toDevice as unknown as typeof transform);

  const restoreFrom = vi
    .spyOn(Utils, "fromDeviceStream")
    .mockImplementation(
      () =>
        fromDeviceFactory() as unknown as TransformStream<
          Uint8Array,
          Types.DeviceOutput
        >,
    );

  return {
    restore: () => {
      restoreTo.mockRestore();
      restoreFrom.mockRestore();
    },
  };
}

function stubNavigatorSerial() {
  type SerialDisconnectHandler = (ev: { port?: any }) => void;
  const handlers = new Set<SerialDisconnectHandler>();

  const serialStub = {
    addEventListener: (
      type: string,
      handler: EventListenerOrEventListenerObject,
    ) => {
      if (type === "disconnect") {
        handlers.add(handler as any as SerialDisconnectHandler);
      }
    },
    removeEventListener: (
      type: string,
      handler: EventListenerOrEventListenerObject,
    ) => {
      if (type === "disconnect") {
        handlers.delete(handler as any as SerialDisconnectHandler);
      }
    },
    dispatchDisconnect(port: any) {
      for (const h of handlers) {
        h({ port });
      }
    },
    requestPort: vi.fn(async () => new FakeSerialPort()),
  };

  const nav: any = (globalThis as any).navigator ?? {};
  const hadNavigator = !!(globalThis as any).navigator;
  const originalSerial = nav.serial;

  if (!hadNavigator) {
    Object.defineProperty(globalThis as any, "navigator", {
      value: nav,
      configurable: true,
      writable: false,
    });
  }

  Object.defineProperty(nav, "serial", {
    value: serialStub,
    configurable: true,
    enumerable: true,
    writable: true,
  });

  return {
    serialStub,
    restore: () => {
      if (hadNavigator) {
        if (originalSerial === undefined) {
          delete (globalThis as any).navigator.serial;
        } else {
          Object.defineProperty((globalThis as any).navigator, "serial", {
            value: originalSerial,
            configurable: true,
            enumerable: true,
            writable: true,
          });
        }
      } else {
        delete (globalThis as any).navigator;
      }
    },
  };
}

class FakeSerialPort {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  lastWritten?: Uint8Array;

  private _readController!: ReadableStreamDefaultController<Uint8Array>;

  constructor() {
    this.readable = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this._readController = controller;
      },
    });

    this.writable = new WritableStream<Uint8Array>({
      write: async (chunk) => {
        this.lastWritten = chunk;
      },
    });
  }

  open(_options?: { baudRate?: number }): Promise<void> {
    return Promise.resolve();
  }

  close(): Promise<void> {
    try {
      this._readController.close();
    } catch {}
    return Promise.resolve();
  }

  pushIncoming(bytes: Uint8Array) {
    this._readController.enqueue(bytes);
  }
}

describe("TransportWebSerial (contract)", () => {
  let transforms: { restore(): void } | undefined;
  let navSerial: { serialStub: any; restore(): void } | undefined;

  beforeEach(() => {
    transforms = stubCoreTransforms();
    navSerial = stubNavigatorSerial();
  });

  afterEach(() => {
    transforms?.restore();
    navSerial?.restore();
    vi.restoreAllMocks();
  });

  runTransportContract({
    name: "TransportWebSerial",
    setup: () => {},
    teardown: () => {},
    create: async () => {
      const fake = new FakeSerialPort();
      const transport = await TransportWebSerial.createFromPort(fake as any);
      (globalThis as any).__ws = { fake, serial: navSerial!.serialStub };
      await Promise.resolve();
      return transport;
    },
    pushIncoming: async (bytes) => {
      (globalThis as any).__ws.fake.pushIncoming(bytes);
      await Promise.resolve();
    },
    assertLastWritten: (bytes) => {
      expect((globalThis as any).__ws.fake.lastWritten).toEqual(bytes);
    },
    triggerDisconnect: async () => {
      (globalThis as any).__ws.serial.dispatchDisconnect(
        (globalThis as any).__ws.fake,
      );
      await Promise.resolve();
    },
  });
});

describe("TransportWebSerial (extras)", () => {
  let transforms: { restore(): void } | undefined;
  let navSerial: { serialStub: any; restore(): void } | undefined;

  beforeEach(() => {
    transforms = stubCoreTransforms();
    navSerial = stubNavigatorSerial();
  });

  afterEach(() => {
    transforms?.restore();
    navSerial?.restore();
    vi.restoreAllMocks();
  });

  it("emits DeviceDisconnected('serial-disconnected') on OS disconnect event", async () => {
    const fake = new FakeSerialPort();
    const transport = await TransportWebSerial.createFromPort(fake as any);
    (globalThis as any).__ws = { fake, serial: navSerial!.serialStub };

    const reader = transport.fromDevice.getReader();

    // drain statuses until connected
    for (let i = 0; i < 3; i++) {
      const { value } = await reader.read();
      if (!value || value.type !== "status") {
        break;
      }
      if (value.data.status === Types.DeviceStatusEnum.DeviceConnected) {
        break;
      }
    }

    // fire OS-level disconnect
    navSerial!.serialStub.dispatchDisconnect(fake as any);
    await Promise.resolve();

    let saw = false;
    for (let i = 0; i < 6; i++) {
      const { value } = await reader.read();
      if (
        value?.type === "status" &&
        value.data.reason === "serial-disconnected"
      ) {
        saw = true;
        break;
      }
    }
    expect(saw).toBe(true);

    reader.releaseLock();
    await transport.disconnect();
  });
});
