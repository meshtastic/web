
import { describe, it, expect } from 'vitest';
import { fromDeviceStream } from './fromDevice';

describe('fromDeviceStream', () => {
  it('should recover from garbage data and broken headers', async () => {
    const stream = fromDeviceStream();
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    const received: any[] = [];
    
    // Start reading in background
    (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        received.push(value);
      }
    })();

    // 1. Send garbage data (no 0x94)
    await writer.write(new Uint8Array([0x01, 0x02, 0x03]));
    
    // 2. Send broken header (0x94 but not 0xc3)
    await writer.write(new Uint8Array([0x94, 0x00, 0x04]));
    
    // 3. Send valid packet (0x94 0xc3 0x00 0x01 0xAA) (len 1)
    // Header: 94 C3 00 01. Payload: AA.
    await writer.write(new Uint8Array([0x94, 0xc3, 0x00, 0x01, 0xAA]));
    
    // Give it a moment to process
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await writer.close();
    
    // Expect at least one packet
    const packet = received.find(r => r.type === 'packet');
    expect(packet).toBeDefined();
    expect(packet.data).toEqual(new Uint8Array([0xAA]));
    
    // Check debug data if possible, but mainly concerned about the packet.
  });
});
