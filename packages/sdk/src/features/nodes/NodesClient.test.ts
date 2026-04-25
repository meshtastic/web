import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { MeshClient } from "../../core/client/MeshClient.ts";
import { createFakeTransport } from "../../core/testing/createFakeTransport.ts";

describe("NodesClient", () => {
  it("populates the list signal from incoming NodeInfo packets", async () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    expect(client.nodes.list.value).toEqual([]);

    client.events.onNodeInfoPacket.dispatch(create(Protobuf.Mesh.NodeInfoSchema, { num: 1 }));
    client.events.onNodeInfoPacket.dispatch(
      create(Protobuf.Mesh.NodeInfoSchema, { num: 2, isFavorite: true }),
    );

    expect(client.nodes.list.value.map((n) => n.num)).toEqual([1, 2]);
    expect(client.nodes.byNum(2)?.isFavorite).toBe(true);
  });

  it("byNum returns undefined for unknown nodes", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    expect(client.nodes.byNum(999)).toBeUndefined();
  });
});
