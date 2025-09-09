import { Duplex } from "node:stream";
import { Types, Utils } from "@meshtastic/core";
import type { SerialPort } from "serialport";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runTransportContract } from "../../../tests/utils/transportContract.ts";
import { TransportNodeSerial } from "./transport.ts";

function isStatusEvent(
  output: Types.DeviceOutput | undefined,
): output is Extract<Types.DeviceOutput, { type: "status" }> {
  return output !== undefined && output.type === "status";
}

class FakeSerialPort extends Duplex {
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

  emitErrorOnce(message = "simulated serial error") {
    this.emit("error", new Error(message));
  }

  emitClose() {
    this.emit("close");
  }

  close() {
    this.destroy();
    this.emit("close");
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

  // Utils.toDeviceStream is a getter
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

describe("TransportNodeSerial (contract)", () => {
  let transformsStub: { restore: () => void } | undefined;

  beforeEach(() => {
    transformsStub = stubCoreTransforms();
  });

  afterEach(() => {
    transformsStub?.restore();
  });

  runTransportContract({
    name: "TransportNodeSerial",
    setup: () => {},
    teardown: () => {
      vi.restoreAllMocks();
    },
    create: async () => {
      const fakePort = new FakeSerialPort();
      const transport = new TransportNodeSerial(
        fakePort as unknown as SerialPort,
      );
      await Promise.resolve();
      (globalThis as unknown as { __fakePort: FakeSerialPort }).__fakePort =
        fakePort;
      return transport;
    },
    pushIncoming: async (bytes) => {
      (
        globalThis as unknown as { __fakePort: FakeSerialPort }
      ).__fakePort.pushIncoming(bytes);
      await Promise.resolve();
    },
    assertLastWritten: (bytes) => {
      const port = (globalThis as unknown as { __fakePort: FakeSerialPort })
        .__fakePort;
      expect(port.lastWritten).toBeDefined();
      expect(port.lastWritten).toEqual(bytes);
    },
    triggerDisconnect: async () => {
      (
        globalThis as unknown as { __fakePort: FakeSerialPort }
      ).__fakePort.emitErrorOnce("test-disconnect");
      await Promise.resolve();
    },
  });
});

describe("TransportNodeSerial (extras)", () => {
  let transformsStub: { restore: () => void } | undefined;

  beforeEach(() => {
    transformsStub = stubCoreTransforms();
  });

  afterEach(() => {
    transformsStub?.restore();
  });

  it("emits DeviceDisconnected with reason 'port-closed' on close event", async () => {
    const fakePort = new FakeSerialPort();
    const transport = new TransportNodeSerial(
      fakePort as unknown as SerialPort,
    );
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

    fakePort.emitClose();
    await Promise.resolve();

    let sawClosed = false;
    for (let i = 0; i < 6; i++) {
      const { value } = await reader.read();
      if (isStatusEvent(value) && value.data.reason === "port-closed") {
        sawClosed = true;
        break;
      }
    }
    expect(sawClosed).toBe(true);

    reader.releaseLock();
    await transport.disconnect();
  });
});
