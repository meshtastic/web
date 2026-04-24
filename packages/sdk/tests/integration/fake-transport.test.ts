import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../src/core/client/MeshClient.ts";
import { createFakeTransport } from "../../src/core/testing/createFakeTransport.ts";
import { ChannelNumber } from "../../src/core/types.ts";

describe("MeshClient with fake transport", () => {
  it("wires MyNodeInfo → device.myNodeNum signal", async () => {
    const { transport, respond } = createFakeTransport();
    const client = new MeshClient({ transport });
    respond.withMyNodeInfo({ myNodeNum: 42 });
    await new Promise((r) => setTimeout(r, 10));
    expect(client.device.myNodeNum.value).toBe(42);
  });

  it("wires NodeInfo → nodes.list signal", async () => {
    const { transport, respond } = createFakeTransport();
    const client = new MeshClient({ transport });
    respond.withNodeInfo({ num: 1234 });
    await new Promise((r) => setTimeout(r, 10));
    expect(client.nodes.list.value.length).toBe(1);
    expect(client.nodes.list.value[0]?.num).toBe(1234);
  });

  it("routes a TEXT_MESSAGE_APP mesh packet into chat.messages", async () => {
    const { transport, respond } = createFakeTransport();
    const client = new MeshClient({ transport });
    const text = new TextEncoder().encode("hello mesh");
    const packet = create(Protobuf.Mesh.MeshPacketSchema, {
      id: 5,
      from: 9,
      to: 0xffffffff,
      channel: ChannelNumber.Primary,
      rxTime: Math.trunc(Date.now() / 1000),
      payloadVariant: {
        case: "decoded",
        value: {
          portnum: Protobuf.Portnums.PortNum.TEXT_MESSAGE_APP,
          payload: text,
          wantResponse: false,
        },
      },
    });
    respond.withMeshPacket(packet);
    await new Promise((r) => setTimeout(r, 10));
    const messages = client.chat.messages(ChannelNumber.Primary).value;
    expect(messages.length).toBe(1);
    expect(messages[0]?.text).toBe("hello mesh");
  });
});
