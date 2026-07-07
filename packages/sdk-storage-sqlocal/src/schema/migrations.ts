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
  {
    version: 2,
    sql: [
      `CREATE TABLE IF NOT EXISTS drafts (
        device_id INTEGER NOT NULL,
        conversation_key TEXT NOT NULL,
        text TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (device_id, conversation_key)
      )`,
    ],
  },
  {
    version: 3,
    sql: [`ALTER TABLE messages ADD COLUMN routing_error INTEGER`],
  },
  {
    version: 4,
    sql: [
      `DELETE FROM messages
        WHERE rowid NOT IN (
          SELECT rowid FROM (
            SELECT
              rowid,
              row_number() OVER (
                PARTITION BY device_id, id
                ORDER BY
                  CASE state
                    WHEN 'ack' THEN 4
                    WHEN 'failed' THEN 3
                    WHEN 'relayed' THEN 2
                    ELSE 1
                  END DESC,
                  CASE WHEN routing_error IS NULL THEN 0 ELSE 1 END DESC,
                  rx_time DESC,
                  rowid DESC
              ) AS rn
            FROM messages
          )
          WHERE rn = 1
        )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_device_id_id_unique ON messages(device_id, id)`,
    ],
  },
  {
    version: 5,
    sql: [
      `WITH direct_buckets AS (
        SELECT
          device_id,
          conversation_key,
          from_node,
          MIN(to_node) AS peer_node,
          COUNT(*) AS message_count,
          COUNT(DISTINCT to_node) AS recipient_count,
          SUM(CASE
            WHEN state <> 'ack' OR routing_error IS NOT NULL THEN 1
            ELSE 0
          END) AS actionable_count
        FROM messages
        WHERE type = 'direct'
          AND conversation_key = 'direct:' || from_node
          AND from_node <> to_node
        GROUP BY device_id, conversation_key, from_node
      ),
      inferred_local_nodes AS (
        SELECT DISTINCT
          device_id,
          from_node
        FROM direct_buckets
        WHERE recipient_count > 1
          OR actionable_count > 0
      ),
      reciprocal_single_peer_buckets AS (
        SELECT outbound.device_id,
               outbound.conversation_key,
               outbound.from_node
        FROM direct_buckets outbound
        JOIN direct_buckets inbound
          ON inbound.device_id = outbound.device_id
          AND outbound.recipient_count = 1
          AND inbound.recipient_count = 1
          AND inbound.from_node = outbound.peer_node
          AND inbound.peer_node = outbound.from_node
        WHERE outbound.actionable_count = 0
          AND inbound.actionable_count = 0
          AND outbound.message_count > inbound.message_count
      ),
      legacy_outbound_buckets AS (
        SELECT direct_buckets.device_id,
               direct_buckets.conversation_key,
               direct_buckets.from_node
        FROM direct_buckets
        WHERE EXISTS (
          SELECT 1
          FROM inferred_local_nodes local
          WHERE local.device_id = direct_buckets.device_id
            AND local.from_node = direct_buckets.from_node
        )
          OR EXISTS (
            SELECT 1
            FROM reciprocal_single_peer_buckets reciprocal
            WHERE reciprocal.device_id = direct_buckets.device_id
              AND reciprocal.conversation_key = direct_buckets.conversation_key
              AND reciprocal.from_node = direct_buckets.from_node
          )
      )
      UPDATE messages
      SET conversation_key = 'direct:' || to_node
      WHERE type = 'direct'
        AND from_node <> to_node
        AND EXISTS (
          SELECT 1
          FROM legacy_outbound_buckets legacy
          WHERE legacy.device_id = messages.device_id
            AND legacy.conversation_key = messages.conversation_key
            AND legacy.from_node = messages.from_node
        )`,
    ],
  },
];
