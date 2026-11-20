import { describe, expect, it } from "vitest";
import initSqlJs, { type Database } from "sql.js";
import { isDuplicateColumn } from "./db.ts";
import { MIGRATIONS } from "./schema.ts";

async function freshSqlite() {
  const SQL = await initSqlJs({});
  return new SQL.Database();
}

const first = MIGRATIONS[0] ?? { version: 0, sql: [] };
const last = MIGRATIONS.at(-1)?.sql[0] ?? "";

function column<T>(rows: T[][] | undefined, index: number): T[] {
  return (rows ?? [])
    .map((row) => row[index])
    .flatMap((v) => (v === undefined ? [] : [v]));
}

function names(db: Database, query: string): unknown[] {
  return column(db.exec(query)[0]?.values, 0);
}

describe("MIGRATIONS", () => {
  it("first migration creates messages, nodes, telemetry, _schema", async () => {
    const db = await freshSqlite();
    for (const stmt of first.sql) db.run(stmt);
    db.run("INSERT INTO _schema (version) VALUES (?)", [first.version]);

    const tables = names(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    expect(tables).toEqual(
      expect.arrayContaining(["_schema", "messages", "nodes", "telemetry"]),
    );

    const version = db.exec("SELECT MAX(version) FROM _schema")[0]
      ?.values[0]?.[0];
    expect(version).toBe(first.version);
  });

  it("messages indexes are present after v1", async () => {
    const db = await freshSqlite();
    for (const stmt of first.sql) db.run(stmt);
    const indexes = names(
      db,
      "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='messages' ORDER BY name",
    );
    expect(indexes).toEqual(
      expect.arrayContaining([
        "idx_messages_conv_rxtime",
        "idx_messages_pending",
        "messages_pk",
      ]),
    );
  });

  it("re-applying v1 statements is idempotent (CREATE IF NOT EXISTS)", async () => {
    const db = await freshSqlite();
    for (const stmt of first.sql) db.run(stmt);
    expect(() => {
      for (const stmt of first.sql) db.run(stmt);
    }).not.toThrow();
  });

  it("v3 adds the signed and ack_proof message columns", async () => {
    const db = await freshSqlite();
    for (const migration of MIGRATIONS) {
      for (const stmt of migration.sql) db.run(stmt);
    }
    const columns = column(
      db.exec("PRAGMA table_info(messages)")[0]?.values,
      1,
    );
    expect(columns).toEqual(expect.arrayContaining(["signed", "ack_proof"]));
  });

  it("v4 adds the received-signal message columns", async () => {
    const db = await freshSqlite();
    for (const migration of MIGRATIONS) {
      for (const stmt of migration.sql) db.run(stmt);
    }
    const columns = (
      db.exec("PRAGMA table_info(messages)")[0]?.values ?? []
    ).map((row) => [row[1], row[2]]);
    expect(columns).toEqual(
      expect.arrayContaining([
        ["snr", "REAL"],
        ["rssi", "INTEGER"],
        ["hops_away", "INTEGER"],
        ["via_mqtt", "INTEGER"],
        ["transport", "INTEGER"],
      ]),
    );
  });

  it("a second ALTER TABLE fails with an error isDuplicateColumn recognises", async () => {
    const db = await freshSqlite();
    for (const migration of MIGRATIONS) {
      for (const stmt of migration.sql) db.run(stmt);
    }
    let error: unknown;
    try {
      db.run(last);
    } catch (e) {
      error = e;
    }
    expect(isDuplicateColumn(error)).toBe(true);
  });
});
