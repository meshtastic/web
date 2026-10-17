import { describe, expect, it } from "vitest";
import type { DeviceOutput } from "../transport/Transport.ts";
import { fromDeviceStream } from "./fromDevice.ts";

const frame = (payload: number[]): number[] => [
  0x94,
  0xc3,
  payload.length >> 8,
  payload.length & 0xff,
  ...payload,
];

async function parse(chunks: number[][]): Promise<DeviceOutput[]> {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new Uint8Array(chunk));
      controller.close();
    },
  }).pipeThrough(fromDeviceStream());
  const out: DeviceOutput[] = [];
  for await (const item of stream as unknown as AsyncIterable<DeviceOutput>) {
    out.push(item);
  }
  return out;
}

const packets = (out: DeviceOutput[]) =>
  out
    .filter((o) => o.type === "packet")
    .map((o) => Array.from(o.data as Uint8Array));

describe("fromDeviceStream", () => {
  it("emits a framed packet", async () => {
    expect(packets(await parse([frame([1, 2, 3])]))).toEqual([[1, 2, 3]]);
  });

  it("keeps a packet whose payload contains 0x94 0xC3", async () => {
    // e.g. a NodeInfo whose public key happens to contain the header bytes
    const payload = [18, 6, 0x10, 0x94, 0xc3, 0x00, 0x7f, 0x01];
    const next = [8, 1];
    const out = await parse([[...frame(payload), ...frame(next)]]);
    expect(packets(out)).toEqual([payload, next]);
  });

  it("reassembles frames split across chunks, including the header", async () => {
    const bytes = [...frame([5, 6, 7, 8]), ...frame([9])];
    const chunks = bytes.map((b) => [b]); // one byte per chunk
    expect(packets(await parse(chunks))).toEqual([[5, 6, 7, 8], [9]]);
  });

  it("emits debug text before a frame", async () => {
    const text = Array.from(new TextEncoder().encode("INFO boot\n"));
    const out = await parse([[...text, ...frame([1])]]);
    expect(out[0]).toEqual({ type: "debug", data: "INFO boot\n" });
    expect(packets(out)).toEqual([[1]]);
  });

  it("skips a header that claims more than the maximum length", async () => {
    // 0x94 0xC3 followed by a bogus 0xFFFF length must not swallow the stream
    const out = await parse([[0x94, 0xc3, 0xff, 0xff, ...frame([4, 2])]]);
    expect(packets(out)).toEqual([[4, 2]]);
  });

  it("waits for the rest of a frame instead of dropping it", async () => {
    const bytes = frame([1, 2, 3, 4, 5]);
    expect(packets(await parse([bytes.slice(0, 6), bytes.slice(6)]))).toEqual([
      [1, 2, 3, 4, 5],
    ]);
  });

  it("parses a large NodeDB burst", async () => {
    const payloads = Array.from({ length: 300 }, (_, i) =>
      Array.from({ length: 120 }, (_, j) => (i * 31 + j * 7) & 0xff),
    );
    const bytes = payloads.flatMap(frame);
    const chunks: number[][] = [];
    for (let i = 0; i < bytes.length; i += 64) {
      chunks.push(bytes.slice(i, i + 64));
    }
    expect(packets(await parse(chunks))).toEqual(payloads);
  });
});
