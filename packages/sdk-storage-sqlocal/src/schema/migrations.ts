import { integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const schemaVersion = sqliteTable("_schema", {
  version: integer("version").primaryKey(),
});

/**
 * Hand-written DDL applied at boot if `_schema` is empty or behind. Drizzle's
 * own migration tooling is great but adds a build-time step; we keep migrations
 * inline so the package self-bootstraps on first DB open.
 */
export const MIGRATIONS: ReadonlyArray<{ version: number; sql: string[] }> = [
  {
    version: 1,
    sql: [
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER NOT NULL,
        device_id INTEGER NOT NULL,
        conversation_key TEXT NOT NULL,
        from_node INTEGER NOT NULL,
        to_node INTEGER NOT NULL,
        channel INTEGER NOT NULL,
        rx_time INTEGER NOT NULL,
        type TEXT NOT NULL,
        text TEXT NOT NULL,
        state TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS messages_pk ON messages(device_id, id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_conv_rxtime ON messages(device_id, conversation_key, rx_time)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_pending ON messages(device_id, state)`,
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
      `CREATE TABLE IF NOT EXISTS _schema (version INTEGER PRIMARY KEY)`,
    ],
  },
];
