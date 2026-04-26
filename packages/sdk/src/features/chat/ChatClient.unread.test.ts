import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { ChannelNumber } from "../../core/types.ts";

const MY_NODE = 0xdeadbeef;

function dispatchInbound(
  client: MeshClient,
  opts: {
    from: number;
    to?: number;
    channel?: ChannelNumber;
    type?: "direct" | "broadcast";
    ms: number;
    text?: string;
  },
): void {
  client.events.onMessagePacket.dispatch({
    id: opts.ms,
    from: opts.from,
    to: opts.to ?? 0,
    channel: opts.channel ?? ChannelNumber.Primary,
    type: opts.type ?? "broadcast",
    rxTime: new Date(opts.ms),
    data: opts.text ?? "hi",
  } as never);
}

function setMyNode(client: MeshClient): void {
  client.events.onMyNodeInfo.dispatch(
    create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum: MY_NODE }),
  );
}

describe("ChatClient unread counts", () => {
  it("starts at zero for every conversation", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    expect(client.chat.unread.total.value).toBe(0);
    expect(
      client.chat.unread.count({ kind: "channel", channel: ChannelNumber.Primary }).value,
    ).toBe(0);
  });

  it("increments on inbound broadcast and decrements on markRead", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    setMyNode(client);

    dispatchInbound(client, { from: 100, ms: 1000 });
    dispatchInbound(client, { from: 200, ms: 2000 });

    expect(
      client.chat.unread.count({ kind: "channel", channel: ChannelNumber.Primary }).value,
    ).toBe(2);
    expect(client.chat.unread.total.value).toBe(2);

    client.chat.unread.markRead({ kind: "channel", channel: ChannelNumber.Primary });
    expect(client.chat.unread.total.value).toBe(0);
  });

  it("does not increment for outbound echoes (from === myNodeNum)", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    setMyNode(client);

    dispatchInbound(client, { from: MY_NODE, ms: 1000 });
    expect(client.chat.unread.total.value).toBe(0);
  });

  it("keys direct messages by peer, not channel", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    setMyNode(client);

    dispatchInbound(client, { from: 50, to: MY_NODE, type: "direct", ms: 1000 });
    expect(client.chat.unread.count({ kind: "direct", peer: 50 }).value).toBe(1);
    expect(
      client.chat.unread.count({ kind: "channel", channel: ChannelNumber.Primary }).value,
    ).toBe(0);
  });
});
