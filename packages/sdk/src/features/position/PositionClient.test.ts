import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";
import { ChannelNumber } from "../../core/types.ts";

describe("PositionClient", () => {
  it("tracks per-node positions from packets", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    client.events.onPositionPacket.dispatch({
      id: 1,
      from: 5,
      to: 5,
      channel: ChannelNumber.Primary,
      type: "direct",
      rxTime: new Date(1000),
      data: create(Protobuf.Mesh.PositionSchema, {
        latitudeI: 477500000,
        longitudeI: -1224400000,
      }),
    });

    expect(client.position.byNode(5)?.latitudeI).toBe(477500000);
    expect(client.position.byNode(99)).toBeUndefined();
    expect(client.position.list.value.length).toBe(1);
  });
});
