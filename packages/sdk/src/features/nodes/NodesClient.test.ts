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

  it("seeds a self-node stub from onMyNodeInfo when no NodeInfo has arrived", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    client.events.onMyNodeInfo.dispatch(create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum: 42 }));

    const seeded = client.nodes.byNum(42);
    expect(seeded).toBeDefined();
    expect(seeded?.num).toBe(42);
    expect(seeded?.user).toBeUndefined();
    expect(seeded?.isFavorite).toBe(false);
    expect(seeded?.isIgnored).toBe(false);
  });

  it("does not overwrite a richer NodeInfo entry with a later MyNodeInfo seed", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    client.events.onNodeInfoPacket.dispatch(
      create(Protobuf.Mesh.NodeInfoSchema, {
        num: 42,
        user: create(Protobuf.Mesh.UserSchema, { id: "!000a", longName: "Alice" }),
      }),
    );
    client.events.onMyNodeInfo.dispatch(create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum: 42 }));

    const node = client.nodes.byNum(42);
    expect(node?.user?.longName).toBe("Alice");
  });

  it("lets a real NodeInfo patch over a seeded self-node stub", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });

    client.events.onMyNodeInfo.dispatch(create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum: 42 }));
    client.events.onNodeInfoPacket.dispatch(
      create(Protobuf.Mesh.NodeInfoSchema, {
        num: 42,
        user: create(Protobuf.Mesh.UserSchema, { id: "!000a", longName: "Alice" }),
      }),
    );

    const node = client.nodes.byNum(42);
    expect(node?.user?.longName).toBe("Alice");
  });

  it("ignores onMyNodeInfo with myNodeNum=0", () => {
    const { transport } = createFakeTransport();
    const client = new MeshClient({ transport });
    client.events.onMyNodeInfo.dispatch(create(Protobuf.Mesh.MyNodeInfoSchema, { myNodeNum: 0 }));
    expect(client.nodes.list.value).toEqual([]);
  });
});
