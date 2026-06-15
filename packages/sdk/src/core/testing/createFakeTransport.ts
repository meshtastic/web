import { create, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { toDeviceStream } from "../packet-codec/toDevice.ts";
import { fromDeviceStream } from "../packet-codec/fromDevice.ts";
import type { Transport } from "../transport/Transport.ts";

export interface FakeTransportHandle {
  transport: Transport;
  respond: FakeResponder;
  /** Exposes what the client has written to the device (already unframed). */
  sent: Uint8Array[];
  /** Closes the simulated connection. */
  close(): Promise<void>;
}

type MyNodeInfoInit = Parameters<typeof create<typeof Protobuf.Mesh.MyNodeInfoSchema>>[1];
type NodeInfoInit = Parameters<typeof create<typeof Protobuf.Mesh.NodeInfoSchema>>[1];

export interface FakeResponder {
  withMyNodeInfo(info: MyNodeInfoInit & { myNodeNum: number }): void;
  withNodeInfo(info: NodeInfoInit & { num: number }): void;
  withConfigCompleteId(id: number): void;
  withMeshPacket(packet: Protobuf.Mesh.MeshPacket): void;
  withRaw(fromRadio: Protobuf.Mesh.FromRadio): void;
}

/**
 * In-memory Transport implementation for tests. The client reads framed bytes
 * from `fromDevice` and writes framed bytes to `toDevice`; the responder
 * enqueues `FromRadio` messages that get framed and delivered to the client.
 */
export function createFakeTransport(): FakeTransportHandle {
  const sent: Uint8Array[] = [];
  let fromDeviceController: ReadableStreamDefaultController<Uint8Array> | undefined;

  const fromDeviceRaw = new ReadableStream<Uint8Array>({
    start(controller) {
      fromDeviceController = controller;
    },
  });

  const toDevice = new WritableStream<Uint8Array>({
    write(chunk) {
      // Strip 0x94 0xC3 framing to record the raw ToRadio bytes.
      if (chunk[0] === 0x94 && chunk[1] === 0xc3) {
        const msb = chunk[2] ?? 0;
        const lsb = chunk[3] ?? 0;
        sent.push(chunk.subarray(4, 4 + (msb << 8) + lsb));
      } else {
        sent.push(chunk);
      }
    },
  });

  const fromDevice = fromDeviceRaw.pipeThrough(fromDeviceStream());

  const framed = new WritableStream<Uint8Array>({
    write(chunk) {
      fromDeviceController?.enqueue(chunk);
    },
  });
  const responderFrame = toDeviceStream();
  responderFrame.readable.pipeTo(framed).catch(() => {
    // stream closed
  });
  const responderWriter = responderFrame.writable.getWriter();

  function enqueueFromRadio(message: Protobuf.Mesh.FromRadio): void {
    const bytes = toBinary(Protobuf.Mesh.FromRadioSchema, message);
    responderWriter.write(bytes);
  }

  const respond: FakeResponder = {
    withMyNodeInfo(partial) {
      enqueueFromRadio(
        create(Protobuf.Mesh.FromRadioSchema, {
          payloadVariant: {
            case: "myInfo",
            value: create(Protobuf.Mesh.MyNodeInfoSchema, partial),
          },
        }),
      );
    },
    withNodeInfo(partial) {
      enqueueFromRadio(
        create(Protobuf.Mesh.FromRadioSchema, {
          payloadVariant: {
            case: "nodeInfo",
            value: create(Protobuf.Mesh.NodeInfoSchema, partial),
          },
        }),
      );
    },
    withConfigCompleteId(id) {
      enqueueFromRadio(
        create(Protobuf.Mesh.FromRadioSchema, {
          payloadVariant: { case: "configCompleteId", value: id },
        }),
      );
    },
    withMeshPacket(packet) {
      enqueueFromRadio(
        create(Protobuf.Mesh.FromRadioSchema, {
          payloadVariant: { case: "packet", value: packet },
        }),
      );
    },
    withRaw(fromRadio) {
      enqueueFromRadio(fromRadio);
    },
  };

  const transport: Transport = {
    toDevice,
    fromDevice,
    async disconnect() {
      try {
        fromDeviceController?.close();
      } catch {
        // already closed
      }
    },
  };

  return {
    transport,
    respond,
    sent,
    async close() {
      await responderWriter.close().catch(() => {});
      await transport.disconnect();
    },
  };
}
