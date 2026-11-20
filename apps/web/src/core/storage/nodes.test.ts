import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SqlocalDb } from "./db.ts";
import { createMemoryDb } from "./memoryDb.ts";
import { SqlocalNodesRepository } from "./nodes.ts";
import type { Node } from "./types.ts";

function node(num: number, partial: Partial<Node> = {}): Node {
  return {
    num,
    isFavorite: false,
    isIgnored: false,
    user: undefined,
    position: undefined,
    deviceMetrics: undefined,
    lastHeard: undefined,
    snr: undefined,
    ...partial,
  };
}

describe("SqlocalNodesRepository", () => {
  let db: SqlocalDb;
  let repo: SqlocalNodesRepository;

  beforeEach(async () => {
    db = await createMemoryDb();
    repo = new SqlocalNodesRepository(db, { deviceId: 1 });
  });

  it("upsert + loadAll round-trip", async () => {
    await repo.upsert(node(1, { isFavorite: true, lastHeard: 1000 }));
    await repo.upsert(node(2, { snr: 5 }));
    const all = await repo.loadAll();
    expect(all.map((n) => n.num).sort()).toEqual([1, 2]);
    expect((await repo.get(1))?.isFavorite).toBe(true);
  });

  it("upsert overwrites prior row", async () => {
    await repo.upsert(node(7, { isFavorite: false }));
    await repo.upsert(node(7, { isFavorite: true }));
    expect((await repo.get(7))?.isFavorite).toBe(true);
  });

  it("preserves user proto across save + load", async () => {
    const user = create(Protobuf.Mesh.UserSchema, {
      id: "!abcdef00",
      longName: "Test Node",
      shortName: "TST",
    });
    await repo.upsert(node(42, { user }));
    const loaded = await repo.get(42);
    expect(loaded?.user?.id).toBe("!abcdef00");
    expect(loaded?.user?.longName).toBe("Test Node");
  });

  it("remove deletes the row", async () => {
    await repo.upsert(node(9));
    await repo.remove(9);
    expect(await repo.get(9)).toBeUndefined();
  });

  it("upsertBatch writes every node in one statement", async () => {
    await repo.upsert(node(2, { snr: 1 }));
    const insert = vi.spyOn(db, "insert");

    await repo.upsertBatch([node(1), node(2, { snr: 9 }), node(3)]);

    expect(insert).toHaveBeenCalledTimes(1);
    expect((await repo.loadAll()).map((n) => n.num).sort()).toEqual([1, 2, 3]);
    expect((await repo.get(2))?.snr).toBe(9);
  });

  it("clear wipes all rows for the scoped device", async () => {
    await repo.upsertBatch([node(1), node(2), node(3)]);
    await repo.clear();
    expect((await repo.loadAll()).length).toBe(0);
  });

  it("scoped per device_id", async () => {
    const repoB = new SqlocalNodesRepository(db, { deviceId: 2 });
    await repo.upsert(node(1, { isFavorite: true }));
    await repoB.upsert(node(1, { isFavorite: false }));
    expect((await repo.get(1))?.isFavorite).toBe(true);
    expect((await repoB.get(1))?.isFavorite).toBe(false);
  });

  it("setScope moves reads and writes to the new scope", async () => {
    await repo.upsert(node(1, { snr: 1 }));
    await repo.upsert(node(2));

    repo.setScope(0xabcd);
    expect(await repo.loadAll()).toEqual([]);
    expect(await repo.get(1)).toBeUndefined();
    await repo.upsert(node(1, { snr: 9 }));
    await repo.remove(2);
    expect((await repo.loadAll()).map((n) => [n.num, n.snr])).toEqual([[1, 9]]);
    await repo.clear();

    const old = new SqlocalNodesRepository(db, { deviceId: 1 });
    expect((await old.loadAll()).map((n) => [n.num, n.snr]).sort()).toEqual([
      [1, 1],
      [2, undefined],
    ]);
  });
});
