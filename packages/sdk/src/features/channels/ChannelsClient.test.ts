import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";

describe("ChannelsClient", () => {
  it("collects channels by index from onChannelPacket", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    client.events.onChannelPacket.dispatch(
      create(Protobuf.Channel.ChannelSchema, {
        index: 0,
        role: Protobuf.Channel.Channel_Role.PRIMARY,
      }),
    );
    client.events.onChannelPacket.dispatch(
      create(Protobuf.Channel.ChannelSchema, {
        index: 1,
        role: Protobuf.Channel.Channel_Role.SECONDARY,
      }),
    );

    expect(client.channels.list.value.length).toBe(2);
    expect(client.channels.get(0)?.role).toBe(Protobuf.Channel.Channel_Role.PRIMARY);
    expect(client.channels.get(1)?.role).toBe(Protobuf.Channel.Channel_Role.SECONDARY);
  });
});
