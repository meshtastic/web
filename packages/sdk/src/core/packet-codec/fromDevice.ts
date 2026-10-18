import type { DeviceOutput } from "../transport/Transport.ts";

const START1 = 0x94;
const START2 = 0xc3;
const HEADER_LENGTH = 4;
/** Firmware's MAX_TO_FROM_RADIO_SIZE: no real frame is longer than this. */
const MAX_PACKET_LENGTH = 512;

/** Index of the next `0x94 0xC3` header, or -1. */
function findHeader(buffer: Uint8Array): number {
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === START1 && buffer[i + 1] === START2) return i;
  }
  return -1;
}

/** `a` followed by `b`, without copying when either is empty. */
function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

/**
 * Transforms a raw byte stream from the device into typed DeviceOutput chunks
 * by parsing the 0x94 0xC3 framing header and length prefix.
 *
 * The length prefix is trusted for frames up to the firmware's maximum
 * packet size. The payload itself is never scanned for a header: it is
 * binary (keys, ids), so `0x94 0xC3` occurs inside valid packets. A header
 * claiming more than the maximum is treated as noise and skipped, so the
 * parser resynchronises on the next real header instead of waiting for
 * bytes that will never come.
 */
export const fromDeviceStream: () => TransformStream<
  Uint8Array,
  DeviceOutput
> = () => {
  let buffer: Uint8Array = new Uint8Array(0);
  const textDecoder = new TextDecoder();

  const emitDebug = (
    bytes: Uint8Array,
    controller: TransformStreamDefaultController<DeviceOutput>,
  ) => {
    if (bytes.length) {
      controller.enqueue({
        type: "debug",
        data: textDecoder.decode(bytes, { stream: true }),
      });
    }
  };

  return new TransformStream<Uint8Array, DeviceOutput>({
    transform(chunk: Uint8Array, controller): void {
      buffer = concat(buffer, chunk);

      while (buffer.length > 0) {
        const start = findHeader(buffer);
        if (start === -1) {
          // No header yet. Flush the text, keeping a trailing 0x94 that may
          // be the first half of a header split across chunks.
          const keep = buffer[buffer.length - 1] === START1 ? 1 : 0;
          emitDebug(buffer.subarray(0, buffer.length - keep), controller);
          buffer = buffer.slice(buffer.length - keep);
          return;
        }

        if (start > 0) {
          emitDebug(buffer.subarray(0, start), controller);
          buffer = buffer.subarray(start);
        }

        if (buffer.length < HEADER_LENGTH) return;

        const length = ((buffer[2] ?? 0) << 8) | (buffer[3] ?? 0);
        if (length > MAX_PACKET_LENGTH) {
          // Not a real header (e.g. 0x94 0xC3 inside debug text); skip it.
          buffer = buffer.subarray(1);
          continue;
        }

        if (buffer.length < HEADER_LENGTH + length) return;

        controller.enqueue({
          type: "packet",
          data: buffer.slice(HEADER_LENGTH, HEADER_LENGTH + length),
        });
        buffer = buffer.subarray(HEADER_LENGTH + length);
      }
    },
  });
};
