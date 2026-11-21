import { Result } from "better-result";
import { beforeEach, describe, expect, it } from "vitest";
import { adoptProvisionalRows, discardStatements } from "./adopt.ts";
import type { SqlocalDb } from "./db.ts";
import { createMemoryStorage } from "./memoryDb.ts";
import {
  type MessageFilterRepository,
  SqlocalMessageFilterRepository,
  type StoredMessageFilter,
} from "./messageFilter.ts";
import type { RunAtomically } from "./adopt.ts";

const RADIO = 0x0a0b0c0d;
const OTHER_RADIO = 0x01020304;
const DM_7 = { kind: "direct", peer: 7 } as const;
const CHANNEL_1 = { kind: "channel", channel: 1 } as const;

async function stored(
  repo: MessageFilterRepository,
): Promise<StoredMessageFilter> {
  const loaded = await repo.load();
  if (Result.isError(loaded)) throw loaded.error;
  return loaded.value;
}

describe("SqlocalMessageFilterRepository", () => {
  let db: SqlocalDb;
  let atomic: RunAtomically;
  let clock: number;
  const repoFor = (deviceId: number) =>
    new SqlocalMessageFilterRepository(db, { deviceId, now: () => clock++ });

  beforeEach(async () => {
    ({ db, atomic } = await createMemoryStorage());
    clock = 1;
  });

  it("starts off, with no words or opt-outs", async () => {
    expect(await stored(repoFor(RADIO))).toEqual({
      enabled: false,
      words: [],
      optedOut: [],
    });
  });

  it("keeps the switch, words in the order added, and opt-outs", async () => {
    const repo = repoFor(RADIO);
    expect(Result.isOk(await repo.setEnabled(true))).toBe(true);
    await repo.addWord("spam");
    await repo.addWord("regex:buy\\d+");
    await repo.addWord("spam");
    await repo.setOptedOut(DM_7, true);
    await repo.setOptedOut(DM_7, true);
    await repo.setOptedOut(CHANNEL_1, true);
    await repo.setOptedOut(CHANNEL_1, false);
    expect(await stored(repo)).toEqual({
      enabled: true,
      words: ["spam", "regex:buy\\d+"],
      optedOut: ["direct:7"],
    });

    await repo.removeWord("spam");
    await repo.setEnabled(false);
    expect(await stored(repo)).toEqual({
      enabled: false,
      words: ["regex:buy\\d+"],
      optedOut: ["direct:7"],
    });
  });

  it("keeps each radio's filter apart", async () => {
    await repoFor(RADIO).addWord("spam");
    await repoFor(RADIO).setEnabled(true);
    expect(await stored(repoFor(OTHER_RADIO))).toEqual({
      enabled: false,
      words: [],
      optedOut: [],
    });
  });

  it("follows setScope", async () => {
    const repo = repoFor(RADIO);
    await repo.addWord("spam");
    repo.setScope(OTHER_RADIO);
    expect((await stored(repo)).words).toEqual([]);
  });

  it("returns Err when the database refuses", async () => {
    await db.run("DROP TABLE filter_words");
    const result = await repoFor(RADIO).addWord("spam");
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.error.name).toBe("MessageFilterStorageError");
    }
  });

  describe("adoption", () => {
    it("merges a provisional scope's filter into the radio's", async () => {
      const radio = repoFor(RADIO);
      await radio.addWord("spam");
      await radio.addWord("eggs");
      await radio.setOptedOut(DM_7, true);
      await radio.setEnabled(false);

      const provisional = repoFor(-5);
      await provisional.addWord("spam");
      await provisional.addWord("ham");
      await provisional.setOptedOut(CHANNEL_1, true);
      await provisional.setEnabled(true);

      expect(Result.isOk(await adoptProvisionalRows(atomic, -5, RADIO))).toBe(
        true,
      );

      const merged = await stored(radio);
      expect(merged.enabled).toBe(true);
      expect([...merged.words].sort()).toEqual(["eggs", "ham", "spam"]);
      expect([...merged.optedOut].sort()).toEqual(["channel:1", "direct:7"]);
      expect(await stored(provisional)).toEqual({
        enabled: false,
        words: [],
        optedOut: [],
      });
    });

    it("keeps the radio's switch when the connection never set it", async () => {
      const radio = repoFor(RADIO);
      await radio.setEnabled(true);
      await repoFor(-5).addWord("ham");
      await adoptProvisionalRows(atomic, -5, RADIO);
      expect((await stored(radio)).enabled).toBe(true);
    });

    it("discards a provisional scope's filter, never a radio's", async () => {
      await repoFor(RADIO).addWord("spam");
      await repoFor(-5).addWord("ham");
      await repoFor(-5).setEnabled(true);
      await repoFor(-5).setOptedOut(DM_7, true);

      await atomic(discardStatements(-5));
      await atomic(discardStatements(RADIO));

      expect(await stored(repoFor(-5))).toEqual({
        enabled: false,
        words: [],
        optedOut: [],
      });
      expect((await stored(repoFor(RADIO))).words).toEqual(["spam"]);
    });
  });
});
