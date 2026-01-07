import type { DeviceOutput } from "../../types.ts";

export const fromDeviceStream: () => TransformStream<Uint8Array, DeviceOutput> =
  () => {
    let byteBuffer = new Uint8Array([]);
    const textDecoder = new TextDecoder();
    return new TransformStream<Uint8Array, DeviceOutput>({
      transform(chunk: Uint8Array, controller): void {
        byteBuffer = new Uint8Array([...byteBuffer, ...chunk]);
        let processingExhausted = false;
        while (byteBuffer.length !== 0 && !processingExhausted) {
          const framingIndex = byteBuffer.indexOf(0x94);

          // Case 1: No 0x94 found
          if (framingIndex === -1) {
            controller.enqueue({
              type: "debug",
              data: textDecoder.decode(byteBuffer),
            });
            byteBuffer = new Uint8Array([]);
            processingExhausted = true;
            continue;
          }

          // Case 2: 0x94 found. Check if we have enough data for framingByte2
          if (framingIndex + 1 >= byteBuffer.length) {
            // Dump preceeding as debug if any
            if (framingIndex > 0) {
              controller.enqueue({
                type: "debug",
                data: textDecoder.decode(byteBuffer.subarray(0, framingIndex)),
              });
              byteBuffer = byteBuffer.subarray(framingIndex);
            }
            // Buffer is just [0x94]
            processingExhausted = true;
            continue;
          }

          const framingByte2 = byteBuffer[framingIndex + 1];
          if (framingByte2 === 0xc3) {
            if (framingIndex > 0) {
              controller.enqueue({
                type: "debug",
                data: textDecoder.decode(byteBuffer.subarray(0, framingIndex)),
              });
              byteBuffer = byteBuffer.subarray(framingIndex);
            }

            // 2. Check length bytes
            if (byteBuffer.length < 4) {
              processingExhausted = true;
              continue;
            }

            const msb = byteBuffer[2];
            const lsb = byteBuffer[3];
            const packetLen = (msb << 8) + lsb;

            if (byteBuffer.length >= 4 + packetLen) {
              const packet = byteBuffer.subarray(4, 4 + packetLen);

              const malformedDetectorIndex = packet.indexOf(0x94);
              if (
                malformedDetectorIndex !== -1 &&
                malformedDetectorIndex + 1 < packet.length &&
                packet[malformedDetectorIndex + 1] === 0xc3
              ) {
                console.warn(
                  `⚠️ Malformed packet found, discarding: ${byteBuffer
                    .subarray(0, 4 + malformedDetectorIndex - 1)
                    .toString()}`,
                );

                byteBuffer = byteBuffer.subarray(4 + malformedDetectorIndex);
              } else {
                byteBuffer = byteBuffer.subarray(4 + packetLen);

                controller.enqueue({
                  type: "packet",
                  data: packet,
                });
              }
            } else {
              processingExhausted = true;
            }
          } else {
            // 0x94 found but followed by !0xc3.
            const discardLen = framingIndex + 1;
            controller.enqueue({
              type: "debug",
              data: textDecoder.decode(byteBuffer.subarray(0, discardLen)),
            });
            byteBuffer = byteBuffer.subarray(discardLen);
          }
        }
      },
    });
  };
