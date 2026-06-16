import * as MeshSDK from "@meshtastic/sdk";
import {
  DeviceStatusEnum,
  type DeviceOutput,
  toDeviceStream,
} from "@meshtastic/sdk";
import { Result } from "better-result";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runTransportContract } from "../../../tests/utils/transportContract.ts";
import { SerialConnectError, TransportWebSerial } from "./transport.ts";

function stubCoreTransforms() {
  const toDevice = () =>
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
    });

  // maps raw bytes -> DeviceOutput.packet
  const fromDeviceFactory = () =>
    new TransformStream<Uint8Array, DeviceOutput>({
      transform(chunk, controller) {
        controller.enqueue({ type: "packet", data: chunk });
      },
    });

  const transform = toDeviceStream;
  // biome-ignore lint/suspicious/noExplicitAny: vi.spyOn's overloads on a re-exported module binding don't match
  const sdk = MeshSDK as any;
  const restoreTo = vi
    .spyOn(sdk, "toDeviceStream", "get")
    .mockReturnValue(toDevice as unknown as typeof transform);

  const restoreFrom = vi
    .spyOn(sdk, "fromDeviceStream")
    .mockImplementation(
      () =>
        fromDeviceFactory() as unknown as TransformStream<
          Uint8Array,
          DeviceOutput
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
  // Mirrors the Web Serial spec: streams are null until `open()` resolves
  // and become null again after `close()`. preparePort relies on this to
  // decide whether the port is currently open.
  readable: ReadableStream<Uint8Array> | null = null;
  writable: WritableStream<Uint8Array> | null = null;
  lastWritten?: Uint8Array;

  private _readController!: ReadableStreamDefaultController<Uint8Array>;

  constructor() {
    this.openStreams();
  }

  private openStreams(): void {
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
    if (!this.readable || !this.writable) {
      this.openStreams();
    }
    return Promise.resolve();
  }

  close(): Promise<void> {
    try {
      this._readController.close();
    } catch {}
    this.readable = null;
    this.writable = null;
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
      const result = await TransportWebSerial.createFromPort(fake as any);
      const transport = result.unwrap();
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
    const result = await TransportWebSerial.createFromPort(fake as any);
    const transport = result.unwrap();
    (globalThis as any).__ws = { fake, serial: navSerial!.serialStub };

    const reader = transport.fromDevice.getReader();

    // drain statuses until connected
    for (let i = 0; i < 3; i++) {
      const { value } = await reader.read();
      if (!value || value.type !== "status") {
        break;
      }
      if (value.data.status === DeviceStatusEnum.DeviceConnected) {
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

describe("TransportWebSerial.createFromPort port hygiene", () => {
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

  it("force-closes a port that's still open from a prior session", async () => {
    const fake = new FakeSerialPort();
    // Streams are non-null right after construction — simulate "previous
    // session left it open". preparePort should close + reopen rather
    // than barfing on the already-open state.
    expect(fake.readable).not.toBeNull();
    const closeSpy = vi.spyOn(fake, "close");
    const result = await TransportWebSerial.createFromPort(fake as any);
    expect(Result.isOk(result)).toBe(true);
    expect(closeSpy).toHaveBeenCalledTimes(1);
    if (Result.isOk(result)) await result.value.disconnect();
  });

  it("retries open() with backoff on InvalidStateError", async () => {
    const fake = new FakeSerialPort();
    await fake.close();
    let attempts = 0;
    vi.spyOn(fake, "open").mockImplementation(async () => {
      attempts += 1;
      if (attempts < 3) {
        const err = new Error("Failed to open serial port") as Error & {
          name: string;
        };
        err.name = "InvalidStateError";
        throw err;
      }
      // 3rd attempt succeeds — recreate streams as the real port would.
      (fake as any).openStreams();
    });
    const result = await TransportWebSerial.createFromPort(fake as any);
    expect(attempts).toBe(3);
    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) await result.value.disconnect();
  });

  it("returns Err(kind=in-use) when open() keeps throwing InvalidStateError", async () => {
    const fake = new FakeSerialPort();
    await fake.close();
    vi.spyOn(fake, "open").mockImplementation(async () => {
      const err = new Error("Failed to open serial port") as Error & {
        name: string;
      };
      err.name = "InvalidStateError";
      throw err;
    });
    const result = await TransportWebSerial.createFromPort(fake as any);
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error).toBeInstanceOf(SerialConnectError);
      expect(result.error.kind).toBe("in-use");
    }
  });
});
