import { Types } from "@meshtastic/core";
import { describe, expect, it } from "vitest";

export interface TransportContract {
  name: string;
  create: () => Promise<Types.Transport>;
  setup?: () => void | Promise<void>;
  teardown?: () => void | Promise<void>;
  pushIncoming?: (bytes: Uint8Array) => void | Promise<void>;
  assertLastWritten?: (bytes: Uint8Array) => void;
  triggerDisconnect?: () => void | Promise<void>;
}

async function readUntilType(
  reader: ReadableStreamDefaultReader<Types.DeviceOutput>,
  expectedType: Types.DeviceOutput["type"],
  maxReads = 20,
): Promise<Types.DeviceOutput> {
  for (let i = 0; i < maxReads; i++) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    if (value && value.type === expectedType) {
      return value;
    }
  }
  throw new Error(
    `Did not receive a '${expectedType}' event within ${maxReads} reads`,
  );
}

export function runTransportContract(contract: TransportContract) {
  describe(contract.name, () => {
    it("reads packets from fromDevice", async () => {
      await contract.setup?.();
      const transport = await contract.create();

      const reader = transport.fromDevice.getReader();
      const sampleBytes = new Uint8Array([0x01, 0x02, 0x03]);

      await contract.pushIncoming?.(sampleBytes);

      const packetEvent = await readUntilType(reader, "packet");
      expect("data" in packetEvent ? packetEvent.data : undefined).toEqual(
        sampleBytes,
      );

      reader.releaseLock();
      await contract.teardown?.();
    });

    it("writes bytes to toDevice", async () => {
      await contract.setup?.();
      const transport = await contract.create();

      const writer = transport.toDevice.getWriter();
      const outgoingBytes = new Uint8Array([0xaa, 0xbb]);
      await writer.write(outgoingBytes);
      await writer.close();

      contract.assertLastWritten?.(outgoingBytes);
      await contract.teardown?.();
    });

    it("disconnect() emits DeviceDisconnected('user')", async () => {
      await contract.setup?.();
      const transport = await contract.create();

      const reader = transport.fromDevice.getReader();

      // Trigger user disconnect
      await transport.disconnect();

      // Read a few events and assert we eventually see the user disconnect.
      let sawUser = false;
      for (let i = 0; i < 10; i++) {
        const { value } = await reader.read();
        if (
          value &&
          value.type === "status" &&
          value.data.status === Types.DeviceStatusEnum.DeviceDisconnected &&
          value.data.reason === "user"
        ) {
          sawUser = true;
          break;
        }
      }
      expect(sawUser).toBe(true);

      reader.releaseLock();
      await contract.teardown?.();
    });

    it("emits DeviceDisconnected when the underlying link drops", async () => {
      await contract.setup?.();
      const transport = await contract.create();

      const reader = transport.fromDevice.getReader();

      await contract.triggerDisconnect?.();

      // As above, read a few events and assert we eventually see "disconnected"
      let sawDrop = false;
      for (let i = 0; i < 10; i++) {
        const { value } = await reader.read();
        if (
          value &&
          value.type === "status" &&
          value.data.status === Types.DeviceStatusEnum.DeviceDisconnected
        ) {
          sawDrop = true;
          break;
        }
      }
      expect(sawDrop).toBe(true);

      reader.releaseLock();
      await contract.teardown?.();
    });
  });
}
