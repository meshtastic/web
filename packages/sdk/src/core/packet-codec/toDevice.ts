/**
 * Pads outbound packets with the 0x94 0xC3 framing header and length prefix.
 */
export const toDeviceStream: () => TransformStream<Uint8Array, Uint8Array> = () => {
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk: Uint8Array, controller): void {
      const bufLen = chunk.length;
      const header = new Uint8Array([0x94, 0xc3, (bufLen >> 8) & 0xff, bufLen & 0xff]);
      controller.enqueue(new Uint8Array([...header, ...chunk]));
    },
  });
};
