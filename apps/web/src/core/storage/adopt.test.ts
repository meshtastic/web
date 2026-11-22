import { Result } from "better-result";
import { describe, expect, it } from "vitest";
import {
  adoptionStatements,
  adoptProvisionalRows,
  discardStatements,
  type SqlStatement,
} from "./adopt.ts";
import { SqlocalMessageRepository } from "./messages.ts";
import { createMemoryStorage } from "./memoryDb.ts";
import { MessageState } from "./types.ts";

const RADIO = 0x0a0b0c0d;
const CHANNEL_0 = { kind: "channel", channel: 0 } as const;

describe("adoptionStatements", () => {
  it("touches only the provisional scope's rows, moving them to the radio", () => {
    for (const { params } of adoptionStatements(-5, RADIO)) {
      expect(params.every((p) => p === -5 || p === RADIO)).toBe(true);
      expect(params).toContain(-5);
    }
  });
});

describe("adoptProvisionalRows", () => {
  it("refuses to take rows from a radio, or file them anywhere but a radio", async () => {
    const ran: SqlStatement[][] = [];
    const run = async (s: ReadonlyArray<SqlStatement>) => {
      ran.push([...s]);
    };
    expect(Result.isError(await adoptProvisionalRows(run, 0x0102, RADIO))).toBe(
      true,
    );
    expect(Result.isError(await adoptProvisionalRows(run, -5, -6))).toBe(true);
    expect(ran).toEqual([]);
  });

  it("moves nothing when the transaction fails part-way", async () => {
    const { db, atomic } = await createMemoryStorage();
    const provisional = new SqlocalMessageRepository(db, { deviceId: -5 });
    await provisional.append({
      id: 1,
      from: 0x1122,
      to: 0xffffffff,
      channel: 0,
      rxTime: new Date(),
      type: "broadcast",
      text: "early",
      state: MessageState.Ack,
    });

    const failing = (statements: ReadonlyArray<SqlStatement>) =>
      atomic([
        ...statements,
        { sql: "SELECT * FROM missing_table", params: [] },
      ]);
    const adopted = await adoptProvisionalRows(failing, -5, RADIO);

    expect(Result.isError(adopted)).toBe(true);
    expect(await provisional.loadRecent(CHANNEL_0, 10)).toHaveLength(1);
    const radio = new SqlocalMessageRepository(db, { deviceId: RADIO });
    expect(await radio.loadRecent(CHANNEL_0, 10)).toEqual([]);
  });
});

describe("discardStatements", () => {
  it("never deletes a radio's rows", () => {
    expect(discardStatements(RADIO)).toEqual([]);
    expect(discardStatements(0)).toEqual([]);
    expect(discardStatements(-5).every((s) => s.params[0] === -5)).toBe(true);
    expect(
      discardStatements().every((s) => s.sql.includes("device_id < 0")),
    ).toBe(true);
  });
});
