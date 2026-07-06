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

  it("latest migration adds a unique message id index", async () => {
    const db = await freshSqlite();
    for (const migration of MIGRATIONS) {
      for (const stmt of migration.sql) db.run(stmt);
    }
    const indexes = db
      .exec(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='messages' ORDER BY name",
      )[0]
      ?.values.flat() as string[];
    expect(indexes).toContain("idx_messages_device_id_id_unique");
  });

  it("latest migration rekeys legacy outbound direct rows to recipient conversations", async () => {
    const db = await freshSqlite();
    for (const migration of MIGRATIONS.filter((m) => m.version < 5)) {
      for (const stmt of migration.sql) db.run(stmt);
    }

    db.run(
      `INSERT INTO messages (
        id, device_id, conversation_key, from_node, to_node, channel, rx_time,
        type, text, state, routing_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [1, 1, "direct:100", 100, 200, 0, 1000, "direct", "out", "relayed", null],
    );
    db.run(
      `INSERT INTO messages (
        id, device_id, conversation_key, from_node, to_node, channel, rx_time,
        type, text, state, routing_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [2, 1, "direct:100", 100, 300, 0, 2000, "direct", "out-2", "ack", null],
    );
    db.run(
      `INSERT INTO messages (
        id, device_id, conversation_key, from_node, to_node, channel, rx_time,
        type, text, state, routing_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [3, 1, "direct:200", 200, 100, 0, 3000, "direct", "in", "ack", null],
    );

    const latest = MIGRATIONS.at(-1)!;
    expect(latest.version).toBe(5);
    for (const stmt of latest.sql) db.run(stmt);

    const rows = db.exec(
      "SELECT id, conversation_key FROM messages ORDER BY id",
    )[0]?.values;
    expect(rows).toEqual([
      [1, "direct:200"],
      [2, "direct:300"],
      [3, "direct:200"],
    ]);
  });

  it("re-applying v1 statements is idempotent (CREATE IF NOT EXISTS)", async () => {
    const db = await freshSqlite();
    for (const stmt of MIGRATIONS[0]!.sql) db.run(stmt);
    expect(() => {
      for (const stmt of MIGRATIONS[0]!.sql) db.run(stmt);
    }).not.toThrow();
  });
});
