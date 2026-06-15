import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import type { Node } from "@meshtastic/sdk";
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlocalDb } from "../db.ts";
import { createMemoryDb } from "../testing/createMemoryDb.ts";
import { SqlocalNodesRepository } from "./SqlocalNodesRepository.ts";

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
});
