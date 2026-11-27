import { getTableColumns, getTableName } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import initSqlJs, { type Database } from "sql.js";
import { applySchema, type RawSql } from "./db.ts";
import { describe, expect, it } from "vitest";
import {
  drafts,
  FIRST_MIGRATABLE_VERSION,
  MIGRATIONS,
  MIN_READER_VERSION,
  migrationSteps,
  type SchemaPlan,
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

/**
 * The DDL of schema version 2, frozen: the oldest version that migrates.
 * Upgrading a database built from it must end where a fresh one does.
 */
const V2_SQL: ReadonlyArray<string> = [
  `CREATE TABLE IF NOT EXISTS messages (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    packet_id INTEGER NOT NULL,
    conversation_key TEXT NOT NULL,
    from_node INTEGER NOT NULL,
    to_node INTEGER NOT NULL,
    channel INTEGER NOT NULL,
    type TEXT NOT NULL,
    rx_time INTEGER NOT NULL,
    text TEXT NOT NULL,
    reply_id INTEGER,
    state TEXT NOT NULL,
    routing_error INTEGER,
    ack_proof INTEGER,
    relays INTEGER,
    signed INTEGER,
    snr REAL,
    rssi INTEGER,
    hops_away INTEGER,
    via_mqtt INTEGER,
    transport INTEGER,
    filtered INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ux_messages_packet ON messages(device_id, from_node, packet_id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_packet_id ON messages(device_id, packet_id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_conv_rx ON messages(device_id, conversation_key, rx_time, seq)`,
  `CREATE TABLE IF NOT EXISTS reactions (
    device_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    from_node INTEGER NOT NULL,
    emoji_key TEXT NOT NULL,
    emoji TEXT NOT NULL,
    packet_id INTEGER NOT NULL,
    to_node INTEGER NOT NULL,
    conversation_key TEXT NOT NULL,
    rx_time INTEGER NOT NULL,
    state TEXT NOT NULL,
    routing_error INTEGER,
    PRIMARY KEY (device_id, target_id, from_node, emoji_key)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_reactions_packet ON reactions(device_id, from_node, packet_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reactions_conv ON reactions(device_id, conversation_key)`,
  `CREATE TABLE IF NOT EXISTS drafts (
    device_id INTEGER NOT NULL,
    conversation_key TEXT NOT NULL,
    text TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (device_id, conversation_key)
  )`,
  `CREATE TABLE IF NOT EXISTS read_markers (
    device_id INTEGER NOT NULL,
    conversation_key TEXT NOT NULL,
    last_read_seq INTEGER NOT NULL,
    PRIMARY KEY (device_id, conversation_key)
  )`,
  `CREATE TABLE IF NOT EXISTS nodes (
    device_id INTEGER NOT NULL,
    num INTEGER NOT NULL,
    last_heard INTEGER,
    snr INTEGER,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_ignored INTEGER NOT NULL DEFAULT 0,
    user_json TEXT,
    position_json TEXT,
    metrics_json TEXT,
    PRIMARY KEY (device_id, num)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_nodes_last_heard ON nodes(device_id, last_heard)`,
  `CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    node_num INTEGER NOT NULL,
    kind TEXT NOT NULL,
    ts INTEGER NOT NULL,
    payload_json TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_node_ts ON telemetry(device_id, node_num, ts)`,
  `CREATE TABLE IF NOT EXISTS filter_words (
    device_id INTEGER NOT NULL,
    pattern TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (device_id, pattern)
  )`,
  `CREATE TABLE IF NOT EXISTS filter_settings (
    device_id INTEGER PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS filter_opt_outs (
    device_id INTEGER NOT NULL,
    conversation_key TEXT NOT NULL,
    PRIMARY KEY (device_id, conversation_key)
  )`,
];

/** A plan one version past v2, for exercising the migration machinery. */
const NEXT: SchemaPlan = {
  version: 3,
  minReader: 2,
  firstMigratable: 2,
  sql: V2_SQL,
  migrations: { 2: ["ALTER TABLE messages ADD COLUMN extra TEXT"] },
};

async function freshSqlite() {
  const SQL = await initSqlJs({});
  return new SQL.Database();
}

/** A made-up plan for the pure statement rules. */
const PLAN: SchemaPlan = {
  version: 4,
  minReader: 3,
  firstMigratable: 2,
  sql: ["DDL"],
  migrations: { 2: ["two a", "two b"], 3: ["three"] },
};
const STAMPS_4 = [
  expect.stringContaining("CREATE TABLE IF NOT EXISTS schema_meta"),
  expect.stringMatching(/'min_reader_version', 3\) ON CONFLICT/),
  "PRAGMA user_version = 4",
];

describe("schemaStatements", () => {
  it("creates and stamps a new database", () => {
    const statements = schemaStatements({ version: 0 });
    expect(statements.slice(0, SCHEMA_SQL.length)).toEqual([...SCHEMA_SQL]);
    expect(statements.at(-1)).toBe(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    expect(statements).toContainEqual(
      expect.stringContaining(`'min_reader_version', ${MIN_READER_VERSION})`),
    );
  });

  it("runs every step from an older version in order, then the DDL and stamps", () => {
    expect(
      schemaStatements({ version: 2, tables: ["messages"] }, PLAN),
    ).toEqual(["two a", "two b", "three", "DDL", ...STAMPS_4]);
    expect(
      schemaStatements({ version: 3, tables: ["messages"] }, PLAN),
    ).toEqual(["three", "DDL", ...STAMPS_4]);
  });

  it("wipes when a step is missing", () => {
    const plan = { ...PLAN, migrations: { 3: ["three"] } };
    expect(migrationSteps(2, plan)).toBeUndefined();
    expect(
      schemaStatements({ version: 2, tables: ["messages"] }, plan),
    ).toEqual([`DROP TABLE IF EXISTS "messages"`, "DDL", ...STAMPS_4]);
  });

  it("has no path from below the first migratable version, even with a step", () => {
    const plan = { ...PLAN, migrations: { ...PLAN.migrations, 1: ["one"] } };
    expect(migrationSteps(1, plan)).toBeUndefined();
    expect(migrationSteps(0, plan)).toBeUndefined();
    expect(migrationSteps(2, plan)).toEqual(["two a", "two b", "three"]);
    expect(
      schemaStatements({ version: 1, tables: ["messages"] }, plan),
    ).toEqual([`DROP TABLE IF EXISTS "messages"`, "DDL", ...STAMPS_4]);
  });

  it("opens a newer file whose minimum reader version the app meets, as it is", () => {
    for (const minReader of [2, 4]) {
      expect(
        schemaStatements(
          { version: 6, tables: ["messages", "schema_meta"], minReader },
          PLAN,
        ),
      ).toEqual(["DDL"]);
    }
  });

  it("wipes a newer file the app can't read, or one with no minimum reader version", () => {
    const wipe = [
      `DROP TABLE IF EXISTS "messages"`,
      `DROP TABLE IF EXISTS "schema_meta"`,
      "DDL",
      ...STAMPS_4,
    ];
    const tables = ["messages", "schema_meta"];
    expect(
      schemaStatements({ version: 6, tables, minReader: 5 }, PLAN),
    ).toEqual(wipe);
    expect(schemaStatements({ version: 6, tables }, PLAN)).toEqual(wipe);
  });

  it("re-runs the idempotent DDL at the current version, recording a missing floor", () => {
    expect(schemaStatements({ version: 4 }, PLAN)).toEqual([
      "DDL",
      expect.stringContaining("CREATE TABLE IF NOT EXISTS schema_meta"),
      expect.stringMatching(/^INSERT OR IGNORE .*'min_reader_version', 3\)$/),
    ]);
  });

  it("drops every user table when it wipes", () => {
    const statements = schemaStatements({
      version: 0,
      tables: ["messages", "sdk_config", "sqlite_sequence", 'odd"name'],
    });
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

  it("has a migration step for every version it can upgrade from", () => {
    for (let v = FIRST_MIGRATABLE_VERSION; v < SCHEMA_VERSION; v++) {
      expect(MIGRATIONS[v], `step ${v} → ${v + 1}`).toBeDefined();
    }
    expect(migrationSteps(FIRST_MIGRATABLE_VERSION) ?? []).toEqual(
      Array.from(
        { length: SCHEMA_VERSION - FIRST_MIGRATABLE_VERSION },
        (_, i) => MIGRATIONS[FIRST_MIGRATABLE_VERSION + i] ?? [],
      ).flat(),
    );
  });

  it("creates every column the Drizzle tables declare", async () => {
    const db = await freshSqlite();
    for (const statement of schemaStatements({ version: 0 })) db.run(statement);
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
    for (const statement of schemaStatements({ version: 0, tables: existing }))
      db.run(statement);

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
      "schema_meta",
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
    expect(userTables(db)).toHaveLength(10);
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

/** The CHECK clauses in a CREATE TABLE statement, parentheses balanced. */
function checkClauses(createSql: string): string[] {
  const clauses: string[] = [];
  const pattern = /\bCHECK\s*\(/gi;
  for (
    let match = pattern.exec(createSql);
    match;
    match = pattern.exec(createSql)
  ) {
    let depth = 0;
    let end = match.index + match[0].length - 1;
    for (; end < createSql.length; end++) {
      if (createSql[end] === "(") depth++;
      else if (createSql[end] === ")" && --depth === 0) break;
    }
    clauses.push(createSql.slice(match.index, end + 1).replace(/\s+/g, " "));
  }
  return clauses;
}

/**
 * Every user table's columns and CHECK clauses, and every index's table,
 * columns (`index_xinfo`: key and included columns, order, collation) and
 * uniqueness (`index_list`), for comparing two databases. An index redefined
 * under the same name differs.
 */
function shape(db: Database): unknown {
  return (
    db.exec(
      "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name",
    )[0]?.values ?? []
  ).map(([type, name, table, sql]) => {
    const quoted = `"${String(name).replaceAll('"', '""')}"`;
    if (type === "table") {
      return [
        type,
        name,
        // name, type, notnull, default, pk
        (db.exec(`PRAGMA table_info(${quoted})`)[0]?.values ?? []).map((row) =>
          row.slice(1),
        ),
        checkClauses(String(sql ?? "")),
      ];
    }
    if (type === "index") {
      return [
        type,
        name,
        table,
        // seqno, cid, name, desc, coll, key
        db.exec(`PRAGMA index_xinfo(${quoted})`)[0]?.values ?? [],
        // unique (index_list: seq, name, unique, origin, partial)
        (
          db.exec(
            `PRAGMA index_list("${String(table).replaceAll('"', '""')}")`,
          )[0]?.values ?? []
        ).find((row) => row[1] === name)?.[2],
        // A partial index's WHERE clause.
        /\bWHERE\b/i.test(String(sql ?? "")) ? String(sql) : null,
      ];
    }
    return [type, name, table];
  });
}

/** A version 2 database holding one message and one draft. */
async function v2Database(): Promise<Database> {
  const db = await freshSqlite();
  for (const statement of V2_SQL) db.run(statement);
  db.run("PRAGMA user_version = 2");
  db.run(
    `INSERT INTO messages (device_id, packet_id, conversation_key, from_node, to_node, channel, type, rx_time, text, state)
     VALUES (1, 42, 'direct:7', 7, 1, 0, 'direct', 1000, 'kept', 'ack')`,
  );
  db.run(
    "INSERT INTO drafts (device_id, conversation_key, text, updated_at) VALUES (1, 'direct:7', 'draft', 1)",
  );
  return db;
}

const version = (db: Database) =>
  db.exec("PRAGMA user_version")[0]?.values[0]?.[0];

const minReader = (db: Database) =>
  db.exec("SELECT value FROM schema_meta WHERE key = 'min_reader_version'")[0]
    ?.values[0]?.[0];

describe("migrations", () => {
  it("compares index columns, uniqueness and CHECK clauses, not just names", async () => {
    const build = async (index: string, check: string, unique = false) => {
      const db = await freshSqlite();
      db.run(`CREATE TABLE t (a INTEGER, b INTEGER CHECK (${check}))`);
      db.run(`CREATE ${unique ? "UNIQUE " : ""}INDEX idx_t ON t(${index})`);
      return shape(db);
    };
    const base = await build("a", "b > 0");
    expect(await build("a", "b > 0")).toEqual(base);
    expect(await build("b", "b > 0")).not.toEqual(base);
    expect(await build("a DESC", "b > 0")).not.toEqual(base);
    expect(await build("a", "b > 1")).not.toEqual(base);
    expect(await build("a", "b > 0", true)).not.toEqual(base);
  });

  it("upgrades a version 2 database to the current schema, keeping its rows", async () => {
    const db = await v2Database();
    await applySchema(rawSql(db));
    expect(version(db)).toBe(SCHEMA_VERSION);
    const fresh = await freshSqlite();
    await applySchema(rawSql(fresh));
    expect(shape(db)).toEqual(shape(fresh));
    expect(db.exec("SELECT text FROM messages")[0]?.values).toEqual([["kept"]]);
    expect(db.exec("SELECT text FROM drafts")[0]?.values).toEqual([["draft"]]);
  });

  it("adds relay_node to the messages of a version 2 database (v3)", async () => {
    const db = await v2Database();
    await applySchema(rawSql(db));
    expect(version(db)).toBeGreaterThanOrEqual(3);
    expect(
      db.exec("SELECT packet_id, text, relay_node FROM messages")[0]?.values,
    ).toEqual([[42, "kept", null]]);
  });

  it("runs a step and keeps the rows", async () => {
    const db = await v2Database();
    await applySchema(rawSql(db), NEXT);
    expect(version(db)).toBe(3);
    expect(db.exec("SELECT text, extra FROM messages")[0]?.values).toEqual([
      ["kept", null],
    ]);
  });

  it("rolls a failed step back, leaving the version and rows as they were", async () => {
    const db = await v2Database();
    await expect(
      applySchema(rawSql(db, /ADD COLUMN extra/), NEXT),
    ).rejects.toThrow(/refused/);
    expect(version(db)).toBe(2);
    expect(db.exec("SELECT text FROM messages")[0]?.values).toEqual([["kept"]]);
    const columns = (
      db.exec("PRAGMA table_info(messages)")[0]?.values ?? []
    ).map((row) => row[1]);
    expect(columns).not.toContain("extra");
  });

  it("wipes a database it has no step for", async () => {
    const db = await v2Database();
    await applySchema(rawSql(db), { ...NEXT, migrations: {} });
    expect(version(db)).toBe(3);
    expect(db.exec("SELECT COUNT(*) FROM messages")[0]?.values).toEqual([[0]]);
  });

  it("records the minimum reader version on a fresh file and on upgrade", async () => {
    const fresh = await freshSqlite();
    await applySchema(rawSql(fresh));
    expect(minReader(fresh)).toBe(MIN_READER_VERSION);

    const db = await v2Database();
    await applySchema(rawSql(db), { ...NEXT, minReader: 3 });
    expect(minReader(db)).toBe(3);
  });

  it("records a missing minimum reader version at the current version", async () => {
    const db = await v2Database();
    await applySchema(rawSql(db), { ...NEXT, version: 2, minReader: 2 });
    expect(version(db)).toBe(2);
    expect(minReader(db)).toBe(2);
  });

  it("opens a newer file it may read with its rows and stamps kept", async () => {
    // Written by a later release: version 9, readable from version 3 on.
    const db = await v2Database();
    await applySchema(rawSql(db), NEXT);
    db.run("ALTER TABLE messages ADD COLUMN later TEXT");
    db.run("UPDATE schema_meta SET value = 3 WHERE key = 'min_reader_version'");
    db.run("PRAGMA user_version = 9");

    await applySchema(rawSql(db), NEXT);
    expect(version(db)).toBe(9);
    expect(minReader(db)).toBe(3);
    expect(db.exec("SELECT text, later FROM messages")[0]?.values).toEqual([
      ["kept", null],
    ]);
  });

  it("wipes a newer file whose minimum reader version is above the app", async () => {
    const db = await v2Database();
    await applySchema(rawSql(db), NEXT);
    db.run("UPDATE schema_meta SET value = 4 WHERE key = 'min_reader_version'");
    db.run("PRAGMA user_version = 9");
    await applySchema(rawSql(db), NEXT);
    expect(version(db)).toBe(3);
    expect(minReader(db)).toBe(2);
    expect(db.exec("SELECT COUNT(*) FROM drafts")[0]?.values).toEqual([[0]]);
  });

  it("wipes a newer file with no minimum reader version", async () => {
    const db = await v2Database();
    db.run("PRAGMA user_version = 9");
    await applySchema(rawSql(db), NEXT);
    expect(version(db)).toBe(3);
    expect(db.exec("SELECT COUNT(*) FROM drafts")[0]?.values).toEqual([[0]]);
  });
});
