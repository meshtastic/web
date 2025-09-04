import type { Socket } from "node:net";
import { Duplex } from "node:stream";
import { Types, Utils } from "@meshtastic/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runTransportContract } from "../../../tests/utils/transportContract.ts";
import { TransportNode } from "./transport.ts";

function isStatusEvent(
  out: Types.DeviceOutput | undefined,
): out is Extract<Types.DeviceOutput, { type: "status" }> {
  return !!out && (out as any).type === "status";
}

class FakeSocket extends Duplex {
  public lastWritten: Uint8Array | undefined;

  constructor() {
    super({ objectMode: false });
  }

  _read() {}

  _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    this.lastWritten = new Uint8Array(
      chunk.buffer,
      chunk.byteOffset,
      chunk.byteLength,
    );
    callback();
  }

  pushIncoming(data: Uint8Array) {
    const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    this.push(buf);
  }

  emitErrorOnce(message = "simulated error") {
    this.emit("error", new Error(message));
  }

  emitClose() {
    this.emit("close");
  }

  override destroy(error?: Error) {
    super.destroy(error);
    this.emit("close");
    return this;
  }
}

function stubCoreTransforms() {
  const toDevice = () =>
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
    });

  const fromDeviceFactory = () =>
    new TransformStream<Uint8Array, Types.DeviceOutput>({
      transform(chunk, controller) {
        controller.enqueue({ type: "packet", data: chunk });
      },
    });

  const transform = Utils.toDeviceStream;
  vi.spyOn(Utils, "toDeviceStream", "get").mockReturnValue(
    toDevice as unknown as typeof transform,
  );

  vi.spyOn(Utils, "fromDeviceStream").mockImplementation(
    () =>
      fromDeviceFactory() as unknown as TransformStream<
        Uint8Array,
        Types.DeviceOutput
      >,
  );

  return {
    restore: () => vi.restoreAllMocks(),
  };
}

describe("TransportNode (contract)", () => {
  let transformsStub: { restore: () => void } | undefined;

  beforeEach(() => {
    transformsStub = stubCoreTransforms();
  });

  afterEach(() => {
    transformsStub?.restore();
  });

  runTransportContract({
    name: "TransportNode",
    setup: () => {},
    teardown: () => {
      vi.restoreAllMocks();
    },
    create: async () => {
      const fakeSocket = new FakeSocket();
      const transport = new TransportNode(fakeSocket as unknown as Socket);
      await Promise.resolve();
      (globalThis as unknown as { __nodeSock: FakeSocket }).__nodeSock =
        fakeSocket;
      return transport;
    },
    pushIncoming: async (bytes) => {
      (
        globalThis as unknown as { __nodeSock: FakeSocket }
      ).__nodeSock.pushIncoming(bytes);
      await Promise.resolve();
    },
    assertLastWritten: (bytes) => {
      const sock = (globalThis as unknown as { __nodeSock: FakeSocket })
        .__nodeSock;
      expect(sock.lastWritten).toBeDefined();
      expect(sock.lastWritten).toEqual(bytes);
    },
    triggerDisconnect: async () => {
      (
        globalThis as unknown as { __nodeSock: FakeSocket }
      ).__nodeSock.emitErrorOnce("test-disconnect");
      await Promise.resolve();
    },
  });
});

describe("TransportNode (extras)", () => {
  let transformsStub: { restore: () => void } | undefined;

  beforeEach(() => {
    transformsStub = stubCoreTransforms();
  });

  afterEach(() => {
    transformsStub?.restore();
  });

  it("emits DeviceDisconnected with reason 'socket-closed' on close event", async () => {
    const fakeSocket = new FakeSocket();
    const transport = new TransportNode(fakeSocket as unknown as Socket);
    const reader = transport.fromDevice.getReader();

    await Promise.resolve();

    const first = await reader.read();
    expect(isStatusEvent(first.value)).toBe(true);
    if (isStatusEvent(first.value)) {
      expect(first.value.data.status).toBe(
        Types.DeviceStatusEnum.DeviceConnecting,
      );
    }

    const second = await reader.read();
    expect(isStatusEvent(second.value)).toBe(true);
    if (isStatusEvent(second.value)) {
      expect(second.value.data.status).toBe(
        Types.DeviceStatusEnum.DeviceConnected,
      );
    }

    fakeSocket.emitClose();
    await Promise.resolve();

    let sawClosed = false;
    for (let i = 0; i < 6; i++) {
      const { value } = await reader.read();
      if (isStatusEvent(value) && value.data.reason === "socket-closed") {
        sawClosed = true;
        break;
      }
    }
    expect(sawClosed).toBe(true);

    reader.releaseLock();
    await transport.disconnect();
  });
});
