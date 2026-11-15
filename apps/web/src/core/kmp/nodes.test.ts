import { create, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { Result } from "better-result";
import { describe, expect, it } from "vitest";
import { type NodesAdmin, NodesClient } from "./nodes.ts";

const admin: NodesAdmin = {
  sendAdmin: () => Promise.resolve(Result.ok(undefined)),
  firmwareVersion: () => "2.8.1",
  myNodeNum: () => 1,
};

function nodeBytes(num: number): Uint8Array {
  return toBinary(
    Protobuf.Mesh.NodeInfoSchema,
    create(Protobuf.Mesh.NodeInfoSchema, {
      num,
      user: create(Protobuf.Mesh.UserSchema, { longName: `Node ${num}` }),
    }),
  );
}

function heardFrom(from: number, rxTime: number): Protobuf.Mesh.MeshPacket {
  return create(Protobuf.Mesh.MeshPacketSchema, { from, rxTime, rxSnr: 5 });
}

function countPublishes(client: NodesClient): () => number {
  let count = 0;
  client.list.subscribe(() => count++);
  return () => count;
}

describe("NodesClient publishing", () => {
  it("publishes a handshake's worth of added nodes once", async () => {
    const client = new NodesClient(admin);
    const publishes = countPublishes(client);

    for (let num = 2; num <= 501; num++) {
      client.applyChange({
        kind: "added",
        node: nodeBytes(num),
        nodes: null,
        nodeNum: num,
      });
    }
    await Promise.resolve();

    expect(publishes()).toBe(1);
    expect(client.list.value).toHaveLength(500);
  });

  it("publishes a burst of heard packets once and keeps the latest values", async () => {
    const client = new NodesClient(admin);
    client.applyChange({
      kind: "added",
      node: nodeBytes(7),
      nodes: null,
      nodeNum: 7,
    });
    await Promise.resolve();
    const publishes = countPublishes(client);

    for (let t = 1; t <= 200; t++) client.heard(heardFrom(7, t));
    await Promise.resolve();

    expect(publishes()).toBe(1);
    expect(client.byNum(7)?.lastHeard).toBe(200);
    expect(client.byNum(7)?.user?.longName).toBe("Node 7");
  });

  it("reads its own pending writes before they publish", () => {
    const client = new NodesClient(admin);
    client.applyChange({
      kind: "added",
      node: nodeBytes(9),
      nodes: null,
      nodeNum: 9,
    });
    client.heard(heardFrom(9, 42));

    expect(client.byNum(9)?.lastHeard).toBe(42);
    expect(client.byNum(9)?.user?.longName).toBe("Node 9");
  });

  it("drops pending writes when a snapshot replaces the node DB", async () => {
    const client = new NodesClient(admin);
    client.heard(heardFrom(3, 10));
    client.applyChange({
      kind: "snapshot",
      nodes: [nodeBytes(4)],
      node: null,
      nodeNum: 0,
    });
    await Promise.resolve();

    expect(client.list.value.map((node) => node.num)).toEqual([4]);
  });
});
