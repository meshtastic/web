import { getTableColumns, getTableName } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import initSqlJs, { type Database } from "sql.js";
import { applySchema, type RawSql } from "./db.ts";
import { describe, expect, it } from "vitest";
import {
  drafts,
  filterOptOuts,
  filterSettings,
  filterWords,
  messages,
  nodes,
  reactions,
  readMarkers,
  SCHEMA_SQL,
  SCHEMA_VERSION,
  schemaStatements,
  telemetry,
} from "./schema.ts";

const TABLES: ReadonlyArray<SQLiteTable> = [
  messages,
  reactions,
  drafts,
  readMarkers,
  nodes,
  telemetry,
  filterWords,
  filterSettings,
  filterOptOuts,
];

async function freshSqlite() {
  const SQL = await initSqlJs({});
  return new SQL.Database();
}

describe("schemaStatements", () => {
  it("creates and stamps a new database", () => {
    const statements = schemaStatements(0, []);
    expect(statements.slice(0, SCHEMA_SQL.length)).toEqual([...SCHEMA_SQL]);
    expect(statements.at(-1)).toBe(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });

  it("re-runs only the idempotent DDL at the current version", () => {
    expect(schemaStatements(SCHEMA_VERSION, ["messages"])).toEqual([
      ...SCHEMA_SQL,
    ]);
  });

  it("drops every user table of another version first", () => {
    const statements = schemaStatements(SCHEMA_VERSION + 1, [
      "messages",
      "sdk_config",
      "sqlite_sequence",
      'odd"name',
    ]);
    expect(statements.slice(0, 3)).toEqual([
      `DROP TABLE IF EXISTS "messages"`,
      `DROP TABLE IF EXISTS "sdk_config"`,
      `DROP TABLE IF EXISTS "odd""name"`,
    ]);
    expect(statements.at(-1)).toBe(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
});

describe("SCHEMA_SQL", () => {
  it("is pinned per SCHEMA_VERSION (bump the version when the DDL changes)", () => {
    expect(SCHEMA_SQL.join(";\n")).toMatchSnapshot(`schema v${SCHEMA_VERSION}`);
  });

  it("creates every column the Drizzle tables declare", async () => {
    const db = await freshSqlite();
    for (const statement of schemaStatements(0, [])) db.run(statement);
    for (const table of TABLES) {
      const declared = Object.values(getTableColumns(table))
        .map((c) => c.name)
        .sort();
      const created = (
        db.exec(`PRAGMA table_info(${getTableName(table)})`)[0]?.values ?? []
      )
        .map((row) => row[1])
        .filter((name): name is string => typeof name === "string")
        .sort();
      expect(created, getTableName(table)).toEqual(declared);
    }
  });

  it("wipes a database left by an older schema", async () => {
    const db = await freshSqlite();
    db.run("CREATE TABLE messages (id INTEGER, legacy TEXT)");
    db.run("CREATE TABLE _schema (version INTEGER PRIMARY KEY)");
    db.run("PRAGMA user_version = 0");
    const existing = (
      db.exec("SELECT name FROM sqlite_master WHERE type = 'table'")[0]
        ?.values ?? []
    )
      .map((row) => row[0])
      .filter((name): name is string => typeof name === "string");
    for (const statement of schemaStatements(0, existing)) db.run(statement);

    const tables = (
      db.exec(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )[0]?.values ?? []
    ).map((row) => row[0]);
    expect(tables).toEqual([
      "drafts",
      "filter_opt_outs",
      "filter_settings",
      "filter_words",
      "messages",
      "nodes",
      "reactions",
      "read_markers",
      "telemetry",
    ]);
    expect(db.exec("PRAGMA user_version")[0]?.values).toEqual([
      [SCHEMA_VERSION],
    ]);
  });
});

/** `applySchema`'s tagged-template SQL over sql.js, optionally failing. */
function rawSql(db: Database, failOn?: RegExp): RawSql {
  return async (query, ...values) => {
    const text = query.join("?");
    if (failOn?.test(text)) throw new Error(`refused: ${text.slice(0, 40)}`);
    const params = values.flatMap((v) =>
      typeof v === "number" || typeof v === "string" ? [v] : [],
    );
    const [result] = db.exec(text, params);
    if (!result) return [];
    return result.values.map((row) =>
      Object.fromEntries(result.columns.map((c, i) => [c, row[i]])),
    );
  };
}

function userTables(db: Database): unknown[] {
  return (
    db.exec(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )[0]?.values ?? []
  ).map((row) => row[0]);
}

describe("applySchema", () => {
  it("builds a fresh file and is a no-op on the second open", async () => {
    const db = await freshSqlite();
    await applySchema(rawSql(db));
    await applySchema(rawSql(db));
    expect(userTables(db)).toHaveLength(9);
    expect(db.exec("PRAGMA user_version")[0]?.values).toEqual([
      [SCHEMA_VERSION],
    ]);
  });

  it("rolls the wipe back when recreating fails", async () => {
    const db = await freshSqlite();
    db.run("CREATE TABLE legacy (id INTEGER)");
    db.run("INSERT INTO legacy VALUES (1)");
    await expect(
      applySchema(rawSql(db, /CREATE TABLE IF NOT EXISTS reactions/)),
    ).rejects.toThrow(/refused/);
    expect(userTables(db)).toEqual(["legacy"]);
    expect(db.exec("SELECT id FROM legacy")[0]?.values).toEqual([[1]]);
    expect(db.exec("PRAGMA user_version")[0]?.values).toEqual([[0]]);
  });
});
