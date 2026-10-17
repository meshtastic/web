import { describe, expect, it } from "vitest";
import initSqlJs from "sql.js";
import { isDuplicateColumn } from "../db.ts";
import { MIGRATIONS } from "./migrations.ts";

async function freshSqlite() {
  const SQL = await initSqlJs({});
  return new SQL.Database();
}

describe("MIGRATIONS", () => {
  it("first migration creates messages, nodes, telemetry, _schema", async () => {
    const db = await freshSqlite();
    for (const stmt of MIGRATIONS[0]!.sql) db.run(stmt);
    db.run("INSERT INTO _schema (version) VALUES (?)", [
      MIGRATIONS[0]!.version,
    ]);

    const tables = db
      .exec(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )[0]
      ?.values.flat() as string[];
    expect(tables).toEqual(
      expect.arrayContaining(["_schema", "messages", "nodes", "telemetry"]),
    );

    const version = db.exec("SELECT MAX(version) FROM _schema")[0]
      ?.values[0]?.[0];
    expect(version).toBe(MIGRATIONS[0]!.version);
  });

  it("messages indexes are present after v1", async () => {
    const db = await freshSqlite();
    for (const stmt of MIGRATIONS[0]!.sql) db.run(stmt);
    const indexes = db
      .exec(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='messages' ORDER BY name",
      )[0]
      ?.values.flat() as string[];
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
    for (const stmt of MIGRATIONS[0]!.sql) db.run(stmt);
    expect(() => {
      for (const stmt of MIGRATIONS[0]!.sql) db.run(stmt);
    }).not.toThrow();
  });

  it("v3 adds the signed and ack_proof message columns", async () => {
    const db = await freshSqlite();
    for (const migration of MIGRATIONS) {
      for (const stmt of migration.sql) db.run(stmt);
    }
    const columns = db
      .exec("PRAGMA table_info(messages)")[0]
      ?.values.map((row) => row[1]) as string[];
    expect(columns).toEqual(expect.arrayContaining(["signed", "ack_proof"]));
  });

  it("v4 adds the received-signal message columns", async () => {
    const db = await freshSqlite();
    for (const migration of MIGRATIONS) {
      for (const stmt of migration.sql) db.run(stmt);
    }
    const columns = db
      .exec("PRAGMA table_info(messages)")[0]
      ?.values.map((row) => [row[1], row[2]]) as [string, string][];
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
      db.run(MIGRATIONS.at(-1)!.sql[0]!);
    } catch (e) {
      error = e;
    }
    expect(isDuplicateColumn(error)).toBe(true);
  });
});
