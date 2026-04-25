import { describe, expect, it } from "vitest";
import initSqlJs from "sql.js";
import { MIGRATIONS } from "./migrations.ts";

async function freshSqlite() {
  const SQL = await initSqlJs({});
  return new SQL.Database();
}

describe("MIGRATIONS", () => {
  it("first migration creates messages, nodes, telemetry, _schema", async () => {
    const db = await freshSqlite();
    for (const stmt of MIGRATIONS[0]!.sql) db.run(stmt);
    db.run("INSERT INTO _schema (version) VALUES (?)", [MIGRATIONS[0]!.version]);

    const tables = db
      .exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0]
      ?.values.flat() as string[];
    expect(tables).toEqual(expect.arrayContaining(["_schema", "messages", "nodes", "telemetry"]));

    const version = db.exec("SELECT MAX(version) FROM _schema")[0]?.values[0]?.[0];
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
      expect.arrayContaining(["idx_messages_conv_rxtime", "idx_messages_pending", "messages_pk"]),
    );
  });

  it("re-applying v1 statements is idempotent (CREATE IF NOT EXISTS)", async () => {
    const db = await freshSqlite();
    for (const stmt of MIGRATIONS[0]!.sql) db.run(stmt);
    expect(() => {
      for (const stmt of MIGRATIONS[0]!.sql) db.run(stmt);
    }).not.toThrow();
  });
});
