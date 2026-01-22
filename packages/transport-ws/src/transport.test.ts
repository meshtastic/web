import { Types, Utils } from "@meshtastic/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runTransportContract } from "../../../tests/utils/transportContract.ts";
import { TransportWebSocket } from "./transport.ts";

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

class FakeWebSocketStream {
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
    } catch { }
    return Promise.resolve();
  }

  pushIncoming(bytes: Uint8Array) {
    this._readController.enqueue(bytes);
  }
}

describe("TransportWebSocket (contract)", () => {
  let transforms: { restore(): void } | undefined;

  beforeEach(() => {
    transforms = stubCoreTransforms();
  });

  afterEach(() => {
    transforms?.restore();
    vi.restoreAllMocks();
  });

  runTransportContract({
    name: "TransportWebSocket",
    setup: () => { },
    teardown: () => { },
    create: async () => {
      const fake = new FakeWebSocketStream();
      const transport = new TransportWebSocket(fake as any, fake.readable, fake.writable);
      (globalThis as any).__ws = { fake };
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
  });
});
