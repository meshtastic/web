import type { DeviceOutput } from "../../types.ts";

export const fromDeviceStream: () => TransformStream<Uint8Array, DeviceOutput> =
  (
    // onReleaseEvent: SimpleEventDispatcher<boolean>,
  ) => {
    let byteBuffer = new Uint8Array([]);
    const textDecoder = new TextDecoder();
    return new TransformStream<Uint8Array, DeviceOutput>({
      transform(chunk: Uint8Array, controller): void {
        // onReleaseEvent.subscribe(() => {
        //   controller.terminate();
        // });
        byteBuffer = new Uint8Array([...byteBuffer, ...chunk]);
        let processingExhausted = false;
        while (byteBuffer.length !== 0 && !processingExhausted) {
          const framingIndex = byteBuffer.indexOf(0x94);
          const framingByte2 = byteBuffer[framingIndex + 1];
          if (framingByte2 === 0xc3) {
            if (byteBuffer.subarray(0, framingIndex).length) {
              controller.enqueue({
                type: "debug",
                data: textDecoder.decode(byteBuffer.subarray(0, framingIndex)),
              });
              byteBuffer = byteBuffer.subarray(framingIndex);
            }

            const msb = byteBuffer[2];
            const lsb = byteBuffer[3];

            if (
              msb !== undefined &&
              lsb !== undefined &&
              byteBuffer.length >= 4 + (msb << 8) + lsb
            ) {
              const packet = byteBuffer.subarray(4, 4 + (msb << 8) + lsb);

              const malformedDetectorIndex = packet.indexOf(0x94);
              if (
                malformedDetectorIndex !== -1 &&
                packet[malformedDetectorIndex + 1] === 0xc3
              ) {
                console.warn(
                  `⚠️ Malformed packet found, discarding: ${byteBuffer
                    .subarray(0, malformedDetectorIndex - 1)
                    .toString()}`,
                );

                byteBuffer = byteBuffer.subarray(malformedDetectorIndex);
              } else {
                byteBuffer = byteBuffer.subarray(3 + (msb << 8) + lsb + 1);

                controller.enqueue({
                  type: "packet",
                  data: packet,
                });
              }
            } else {
              /** Only partioal message in buffer, wait for the rest */
              processingExhausted = true;
            }
          } else {
            /** Message not complete, only 1 byte in buffer */
            processingExhausted = true;
          }
        }
      },
    });
  };
