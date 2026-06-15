import { ChannelNumber } from "@meshtastic/sdk";
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlocalDb } from "../db.ts";
import { createMemoryDb } from "../testing/createMemoryDb.ts";
import { SqlocalDraftRepository } from "./SqlocalDraftRepository.ts";

describe("SqlocalDraftRepository", () => {
  let db: SqlocalDb;
  let repo: SqlocalDraftRepository;

  beforeEach(async () => {
    db = await createMemoryDb();
    repo = new SqlocalDraftRepository(db, { deviceId: 1 });
  });

  it("save then load returns the same text", async () => {
    await repo.save({ kind: "channel", channel: ChannelNumber.Primary }, "hello");
    expect(await repo.load({ kind: "channel", channel: ChannelNumber.Primary })).toBe("hello");
  });

  it("save with empty text deletes the row", async () => {
    await repo.save({ kind: "direct", peer: 7 }, "wip");
    await repo.save({ kind: "direct", peer: 7 }, "");
    expect(await repo.load({ kind: "direct", peer: 7 })).toBe("");
  });

  it("clear removes the row", async () => {
    await repo.save({ kind: "channel", channel: ChannelNumber.Channel1 }, "draft");
    await repo.clear({ kind: "channel", channel: ChannelNumber.Channel1 });
    expect(await repo.load({ kind: "channel", channel: ChannelNumber.Channel1 })).toBe("");
  });

  it("upsert overwrites prior text without throwing", async () => {
    await repo.save({ kind: "direct", peer: 12 }, "first");
    await repo.save({ kind: "direct", peer: 12 }, "second");
    expect(await repo.load({ kind: "direct", peer: 12 })).toBe("second");
  });

  it("scoped per device_id", async () => {
    const repoB = new SqlocalDraftRepository(db, { deviceId: 2 });
    await repo.save({ kind: "channel", channel: ChannelNumber.Primary }, "from-1");
    await repoB.save({ kind: "channel", channel: ChannelNumber.Primary }, "from-2");
    expect(await repo.load({ kind: "channel", channel: ChannelNumber.Primary })).toBe("from-1");
    expect(await repoB.load({ kind: "channel", channel: ChannelNumber.Primary })).toBe("from-2");
  });

  it("loadAll returns all drafts for the device", async () => {
    await repo.save({ kind: "channel", channel: ChannelNumber.Primary }, "a");
    await repo.save({ kind: "direct", peer: 99 }, "b");
    const all = await repo.loadAll();
    expect(all.length).toBe(2);
  });
});
