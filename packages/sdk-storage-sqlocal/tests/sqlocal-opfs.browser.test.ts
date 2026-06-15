import { ChannelNumber, type Message, MessageState } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { SqlocalMessageRepository } from "../src/chat/SqlocalMessageRepository.ts";
import { createSqlocalDb } from "../src/db.ts";

/**
 * Browser-mode end-to-end test: opens a real OPFS-backed SQLite database via
 * sqlocal, exercises the chat repository, asserts persistence across two
 * separate `createSqlocalDb()` calls (simulating page reload).
 *
 * Run with `pnpm --filter @meshtastic/sdk-storage-sqlocal test:browser`.
 */

function msg(id: number, ms: number, text = "t"): Message {
  return {
    id,
    from: 1,
    to: 0xffffffff,
    channel: ChannelNumber.Primary,
    rxTime: new Date(ms),
    type: "broadcast",
    text,
    state: MessageState.Ack,
  };
}

describe.runIf(typeof navigator !== "undefined")("sqlocal OPFS round-trip", () => {
  it("persists messages across DB instances", async () => {
    const dbPath = `meshtastic-test-${Date.now()}.db`;
    const dbA = await createSqlocalDb({ databasePath: dbPath });
    const repoA = new SqlocalMessageRepository(dbA, { deviceId: 1 });
    await repoA.appendBatch([msg(1, 1000), msg(2, 2000)]);

    const dbB = await createSqlocalDb({ databasePath: dbPath });
    const repoB = new SqlocalMessageRepository(dbB, { deviceId: 1 });
    const out = await repoB.loadRecent({ kind: "channel", channel: ChannelNumber.Primary }, 10);
    expect(out.map((m) => m.id)).toEqual([1, 2]);
  });
});
