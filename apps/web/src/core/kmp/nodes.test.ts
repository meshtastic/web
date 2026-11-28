import { create, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { createMemoryDb } from "@core/storage/memoryDb.ts";
import { SqlocalNodesRepository } from "@core/storage/nodes.ts";
import type { Node, NodesRepository } from "@core/storage/types.ts";
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

class FakeNodesRepository implements NodesRepository {
  readonly rows = new Map<number, Node>();
  readonly batches: Node[][] = [];

  loadAll(): Promise<Node[]> {
    return Promise.resolve([...this.rows.values()]);
  }

  get(nodeNum: number): Promise<Node | undefined> {
    return Promise.resolve(this.rows.get(nodeNum));
  }

  upsert(node: Node): Promise<void> {
    this.rows.set(node.num, node);
    return Promise.resolve();
  }

  upsertBatch(nodes: ReadonlyArray<Node>): Promise<void> {
    this.batches.push([...nodes]);
    for (const node of nodes) this.rows.set(node.num, node);
    return Promise.resolve();
  }

  remove(nodeNum: number): Promise<void> {
    this.rows.delete(nodeNum);
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.rows.clear();
    return Promise.resolve();
  }
}

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
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

describe("NodesClient persistence", () => {
  it("writes a handshake's worth of added nodes in one batch", async () => {
    const repository = new FakeNodesRepository();
    const client = new NodesClient(admin, repository);
    await settle();

    for (let num = 2; num <= 501; num++) {
      client.applyChange({
        kind: "added",
        node: nodeBytes(num),
        nodes: null,
        nodeNum: num,
      });
    }
    await settle();

    expect(repository.batches).toHaveLength(1);
    expect(repository.batches[0]).toHaveLength(500);
  });

  it("writes a burst of heard packets as one node with the latest lastHeard", async () => {
    const repository = new FakeNodesRepository();
    const client = new NodesClient(admin, repository);
    await settle();
    client.applyChange({
      kind: "added",
      node: nodeBytes(7),
      nodes: null,
      nodeNum: 7,
    });
    await settle();
    repository.batches.length = 0;

    for (let t = 1; t <= 200; t++) client.heard(heardFrom(7, t));
    await settle();

    expect(repository.batches).toHaveLength(1);
    expect(repository.batches[0]?.map((node) => node.num)).toEqual([7]);
    expect(repository.batches[0]?.[0]?.lastHeard).toBe(200);
  });

  it("writes every node of a snapshot in one batch", async () => {
    const repository = new FakeNodesRepository();
    const client = new NodesClient(admin, repository);
    await settle();

    client.applyChange({
      kind: "snapshot",
      nodes: [nodeBytes(4), nodeBytes(5), nodeBytes(6)],
      node: null,
      nodeNum: 0,
    });
    await settle();

    expect(repository.batches).toHaveLength(1);
    expect(repository.batches[0]?.map((node) => node.num)).toEqual([4, 5, 6]);
  });

  it("hydrates a fresh client from the nodes a previous client wrote", async () => {
    const repository = new FakeNodesRepository();
    const first = new NodesClient(admin, repository);
    await settle();
    first.applyChange({
      kind: "added",
      node: nodeBytes(11),
      nodes: null,
      nodeNum: 11,
    });
    first.heard(heardFrom(11, 77));
    await settle();

    const second = new NodesClient(admin, repository);
    await settle();

    expect(second.list.value.map((node) => node.num)).toEqual([11]);
    expect(second.byNum(11)?.lastHeard).toBe(77);
    expect(second.byNum(11)?.user?.longName).toBe("Node 11");
  });
});

describe("NodesClient over the stored node cache", () => {
  it("shows the NodeInfo fields and status after a reload, and keeps the status through the next snapshot", async () => {
    const repository = new SqlocalNodesRepository(await createMemoryDb(), {
      deviceId: 1,
    });
    const first = new NodesClient(admin, repository);
    await settle();
    first.applyChange({
      kind: "added",
      node: toBinary(
        Protobuf.Mesh.NodeInfoSchema,
        create(Protobuf.Mesh.NodeInfoSchema, {
          num: 11,
          channel: 2,
          viaMqtt: true,
          hopsAway: 3,
          isKeyManuallyVerified: true,
          isMuted: true,
          hasXeddsaSigned: true,
        }),
      ),
      nodes: null,
      nodeNum: 11,
    });
    first.patch(11, { status: "on the trail" });
    await settle();

    const second = new NodesClient(admin, repository);
    await settle();
    expect(second.byNum(11)).toMatchObject({
      channel: 2,
      viaMqtt: true,
      hopsAway: 3,
      isKeyManuallyVerified: true,
      isMuted: true,
      hasXeddsaSigned: true,
      status: "on the trail",
    });

    second.applyChange({
      kind: "snapshot",
      nodes: [nodeBytes(11)],
      node: null,
      nodeNum: 0,
    });
    await settle();
    expect(second.byNum(11)?.status).toBe("on the trail");
    expect((await repository.get(11))?.status).toBe("on the trail");
  });
});

describe("NodesClient hydration", () => {
  /** `stored` behind a `loadAll` that reads when asked, as the database does, but answers on `release`. */
  function lateLoading(stored: NodesRepository) {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const repository: NodesRepository = {
      loadAll: async () => {
        const rows = await stored.loadAll();
        await gate;
        return rows;
      },
      get: (num) => stored.get(num),
      upsert: (node) => stored.upsert(node),
      upsertBatch: (nodes) => stored.upsertBatch(nodes),
      remove: (num) => stored.remove(num),
      clear: () => stored.clear(),
    };
    return { repository, release };
  }

  const keyed = (byte: number) =>
    create(Protobuf.Mesh.UserSchema, {
      longName: "Keyed",
      publicKey: new Uint8Array(32).fill(byte),
    });

  it("fills a node written before the stored copy loaded, without erasing what was stored", async () => {
    const stored = new SqlocalNodesRepository(await createMemoryDb(), {
      deviceId: 1,
    });
    await stored.upsert({
      num: 11,
      isFavorite: false,
      isIgnored: false,
      user: create(Protobuf.Mesh.UserSchema, { longName: "Stored" }),
      channel: 2,
      viaMqtt: true,
      hopsAway: 3,
      isKeyManuallyVerified: true,
      isMuted: true,
      hasXeddsaSigned: true,
      status: "on the trail",
    });
    const { repository, release } = lateLoading(stored);

    const client = new NodesClient(admin, repository);
    client.heard(heardFrom(11, 500));
    await settle();
    // The bare node has been written over the stored row by now.
    expect((await stored.get(11))?.status).toBeUndefined();

    release();
    await settle();
    await settle();

    const expected = {
      lastHeard: 500,
      channel: 2,
      viaMqtt: true,
      hopsAway: 3,
      isKeyManuallyVerified: true,
      isMuted: true,
      hasXeddsaSigned: true,
      status: "on the trail",
    };
    expect(client.byNum(11)).toMatchObject(expected);
    expect(client.byNum(11)?.user?.longName).toBe("Stored");
    const row = await stored.get(11);
    expect(row).toMatchObject(expected);
    expect(row?.user?.longName).toBe("Stored");
  });

  it.each([
    ["a different key", 2, undefined],
    ["the same key", 1, true],
  ])(
    "carries the stored key verification onto %s only when it matches",
    async (_, liveKey, verified) => {
      const stored = new SqlocalNodesRepository(await createMemoryDb(), {
        deviceId: 1,
      });
      await stored.upsert({
        num: 11,
        isFavorite: false,
        isIgnored: false,
        user: keyed(1),
        isKeyManuallyVerified: true,
        isMuted: true,
      });
      const { repository, release } = lateLoading(stored);

      const client = new NodesClient(admin, repository);
      client.patch(11, { user: keyed(liveKey) });
      release();
      await settle();
      await settle();

      expect(client.byNum(11)?.isKeyManuallyVerified).toBe(verified);
      expect(client.byNum(11)?.isMuted).toBe(true);
      expect((await stored.get(11))?.isKeyManuallyVerified).toBe(verified);
    },
  );
});

describe("NodesClient favourite and ignored sets", () => {
  // Node changes are published together on a microtask.
  const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

  it("keep their identity until membership changes", async () => {
    const nodes = new NodesClient(admin);
    const seen: Array<ReadonlySet<number>> = [];
    const off = nodes.favoriteNums.subscribe((s) => seen.push(s));
    nodes.patch(5, { isFavorite: true });
    await tick();
    const favorites = nodes.favoriteNums.value;
    expect([...favorites]).toEqual([5]);

    nodes.patch(5, { snr: 3 });
    nodes.heard(heardFrom(6, 100));
    await tick();
    expect(nodes.favoriteNums.value).toBe(favorites);

    nodes.patch(6, { isIgnored: true });
    await tick();
    expect(nodes.favoriteNums.value).toBe(favorites);
    expect([...nodes.ignoredNums.value]).toEqual([6]);

    nodes.patch(5, { isFavorite: false });
    await tick();
    expect(nodes.favoriteNums.value.size).toBe(0);
    expect(new Set(seen).size).toBe(2);
    off();
  });
});
