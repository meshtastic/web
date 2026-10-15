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
    expect(client.channels.get(0)?.role).toBe(
      Protobuf.Channel.Channel_Role.PRIMARY,
    );
    expect(client.channels.get(1)?.role).toBe(
      Protobuf.Channel.Channel_Role.SECONDARY,
    );
  });

  it("keeps one beacon offer per sender and skips offers without a channel", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    const offer = (from: number, message: string, withChannel = true) =>
      client.events.onMeshBeaconPacket.dispatch({
        id: 1,
        from,
        to: 0xffffffff,
        type: "broadcast",
        channel: 0,
        rxTime: new Date(),
        data: create(Protobuf.MeshBeacon.MeshBeaconSchema, {
          message,
          offerChannel: withChannel
            ? create(Protobuf.Channel.ChannelSettingsSchema, { name: "x" })
            : undefined,
        }),
      });

    offer(1, "first");
    offer(2, "other");
    offer(1, "second");
    offer(3, "no channel", false);

    expect(
      client.channels.beaconOffers.value.map((o) => [o.from, o.beacon.message]),
    ).toEqual([
      [1, "second"],
      [2, "other"],
    ]);
    client.channels.dismissBeaconOffer(1);
    expect(client.channels.beaconOffers.value.map((o) => o.from)).toEqual([2]);
  });
});
