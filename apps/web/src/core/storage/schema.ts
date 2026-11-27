import type { Protobuf } from "@core/protobuf.ts";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { MessageState } from "./types.ts";

/**
 * The web app's own SQLite database (OPFS, via sqlocal): message history,
 * reactions, drafts, read markers, and caches of the node DB and telemetry.
 * The Kotlin SDK keeps its device state in a separate database it manages
 * itself (see core/kmp/browserStorage.ts), so nothing here is shared with it.
 *
 * Every table is scoped by `device_id`: the node number of the radio the
 * history belongs to.
 *
 * The schema is stamped in `PRAGMA user_version`. On open, a database at an
 * older version is upgraded step by step through `MIGRATIONS`; one that
 * can't be (no step for it, or newer than this release) is wiped and
 * recreated (see `schemaStatements`). The file name is new as well, so a
 * database written by a release before versioning is never opened at all.
 */
export const DATABASE_FILE = "meshtastic-app-v1.db";

/**
 * Bump whenever the DDL below changes, and add the `MIGRATIONS` step that
 * brings the previous version up to it. schema.test.ts pins the DDL per
 * version and checks the steps, so an edit without both fails.
 */
export const SCHEMA_VERSION = 2;

/**
 * The oldest version that can still be upgraded. Databases from before it
 * are wiped: there is no step for them.
 */
export const FIRST_MIGRATABLE_VERSION = 2;

/**
 * Upgrade steps: `MIGRATIONS[n]` takes a database from version `n` to
 * `n + 1`. Steps run in order inside the open transaction, followed by the
 * idempotent `SCHEMA_SQL` (which creates any new table or index) and the
 * new version stamp. Prefer additive changes (`ALTER TABLE ... ADD COLUMN`,
 * new tables, new indexes); see SCHEMA.md for what SQLite can't alter.
 */
export const MIGRATIONS: Readonly<Record<number, ReadonlyArray<string>>> = {};

/**
 * The minimum reader version `SCHEMA_VERSION` declares: the oldest app
 * schema that can still safely read and write a file at this version. An
 * additive change (a nullable column, a new table or index) keeps it where
 * it was, since older code ignores what it doesn't know; a change older code
 * would misread raises it to the new version. Stored in the file (see
 * `SCHEMA_META_SQL`), so an older release that opens it knows whether it may.
 */
export const MIN_READER_VERSION = 2;

const MESSAGE_STATES = [
  MessageState.Pending,
  MessageState.Delivered,
  MessageState.Ack,
  MessageState.Failed,
] as const;

/**
 * Text messages, one row per packet. `seq` is the local arrival order, which
 * read markers compare against: `rx_time` comes from the radio's clock and
 * can be missing or skewed. A packet is unique per (device, sender, packet
 * id), so a retransmission the radio hands us twice is stored once.
 */
export const messages = sqliteTable(
  "messages",
  {
    seq: integer("seq").primaryKey({ autoIncrement: true }),
    deviceId: integer("device_id").notNull(),
    packetId: integer("packet_id").notNull(),
    conversationKey: text("conversation_key").notNull(),
    fromNode: integer("from_node").notNull(),
    toNode: integer("to_node").notNull(),
    channel: integer("channel").notNull(),
    type: text("type", { enum: ["broadcast", "direct"] }).notNull(),
    rxTime: integer("rx_time").notNull(),
    text: text("text").notNull(),
    /** Packet id of the message this one replies to. */
    replyId: integer("reply_id"),
    state: text("state", { enum: MESSAGE_STATES }).notNull(),
    routingError: integer("routing_error").$type<Protobuf.Mesh.Routing_Error>(),
    ackProof:
      integer("ack_proof").$type<Protobuf.Mesh.MeshPacket_AckProofStatus>(),
    /** Acks heard for an outgoing message: relays plus the recipient. */
    relays: integer("relays"),
    signed: integer("signed", { mode: "boolean" }),
    snr: real("snr"),
    rssi: integer("rssi"),
    hopsAway: integer("hops_away"),
    viaMqtt: integer("via_mqtt", { mode: "boolean" }),
    transport:
      integer("transport").$type<Protobuf.Mesh.MeshPacket_TransportMechanism>(),
    /**
     * Hidden by the message filter when it arrived: never unread, never the
     * preview (see core/messaging/messageFilter.ts).
     */
    filtered: integer("filtered", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [
    uniqueIndex("ux_messages_packet").on(t.deviceId, t.fromNode, t.packetId),
    index("idx_messages_packet_id").on(t.deviceId, t.packetId),
    index("idx_messages_conv_rx").on(
      t.deviceId,
      t.conversationKey,
      t.rxTime,
      t.seq,
    ),
  ],
);

export type MessageRow = typeof messages.$inferSelect;
export type MessageInsert = typeof messages.$inferInsert;

/**
 * Tapback reactions, kept apart from `messages` on purpose:
 *
 * - The primary key (device, target, sender, emoji) is exactly what a chip
 *   counts (distinct senders per emoji), so a repeated packet is a no-op and
 *   removing my own reaction is a single delete.
 * - Reactions don't fill the message pagination window or the per-
 *   conversation retention cap, and can't become a conversation's last-message
 *   preview or count as unread.
 * - All reactions for a page of messages load with one indexed lookup on
 *   `target_id`.
 *
 * `emoji_key` is the emoji without variation selectors (see
 * core/messaging/reactions.ts `reactionKey`); `emoji` is the spelling
 * received. `packet_id` is the reaction packet itself, which acks refer to;
 * `to_node` is where it went, so an ack from the peer counts as delivered.
 */
export const reactions = sqliteTable(
  "reactions",
  {
    deviceId: integer("device_id").notNull(),
    targetId: integer("target_id").notNull(),
    fromNode: integer("from_node").notNull(),
    emojiKey: text("emoji_key").notNull(),
    emoji: text("emoji").notNull(),
    packetId: integer("packet_id").notNull(),
    toNode: integer("to_node").notNull(),
    conversationKey: text("conversation_key").notNull(),
    rxTime: integer("rx_time").notNull(),
    state: text("state", { enum: MESSAGE_STATES }).notNull(),
    routingError: integer("routing_error").$type<Protobuf.Mesh.Routing_Error>(),
  },
  (t) => [
    primaryKey({
      columns: [t.deviceId, t.targetId, t.fromNode, t.emojiKey],
    }),
    index("idx_reactions_packet").on(t.deviceId, t.fromNode, t.packetId),
    index("idx_reactions_conv").on(t.deviceId, t.conversationKey),
  ],
);

export type ReactionRow = typeof reactions.$inferSelect;
export type ReactionInsert = typeof reactions.$inferInsert;

export const drafts = sqliteTable(
  "drafts",
  {
    deviceId: integer("device_id").notNull(),
    conversationKey: text("conversation_key").notNull(),
    text: text("text").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.deviceId, t.conversationKey] })],
);

export type DraftRow = typeof drafts.$inferSelect;
export type DraftInsert = typeof drafts.$inferInsert;

/**
 * How far each conversation has been read, as a `messages.seq`. Unread is
 * every message from someone else with a higher `seq`.
 */
export const readMarkers = sqliteTable(
  "read_markers",
  {
    deviceId: integer("device_id").notNull(),
    conversationKey: text("conversation_key").notNull(),
    lastReadSeq: integer("last_read_seq").notNull(),
  },
  (t) => [primaryKey({ columns: [t.deviceId, t.conversationKey] })],
);

/**
 * Snapshot of the device's NodeDB, as protobuf bytes in base64 (the `_json`
 * names are historical). Last-heard duplicates the column for sorting.
 */
export const nodes = sqliteTable(
  "nodes",
  {
    deviceId: integer("device_id").notNull(),
    num: integer("num").notNull(),
    lastHeard: integer("last_heard"),
    snr: integer("snr"),
    isFavorite: integer("is_favorite", { mode: "boolean" })
      .notNull()
      .default(false),
    isIgnored: integer("is_ignored", { mode: "boolean" })
      .notNull()
      .default(false),
    userJson: text("user_json"),
    positionJson: text("position_json"),
    metricsJson: text("metrics_json"),
  },
  (t) => [
    primaryKey({ columns: [t.deviceId, t.num] }),
    index("idx_nodes_last_heard").on(t.deviceId, t.lastHeard),
  ],
);

export type NodeRow = typeof nodes.$inferSelect;
export type NodeInsert = typeof nodes.$inferInsert;

export const telemetry = sqliteTable(
  "telemetry",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deviceId: integer("device_id").notNull(),
    nodeNum: integer("node_num").notNull(),
    kind: text("kind").notNull(),
    ts: integer("ts").notNull(),
    payloadJson: text("payload_json").notNull(),
  },
  (t) => [index("idx_telemetry_node_ts").on(t.deviceId, t.nodeNum, t.ts)],
);

export type TelemetryRow = typeof telemetry.$inferSelect;
export type TelemetryInsert = typeof telemetry.$inferInsert;

/**
 * Message filter entries, per radio: a word, or `regex:` and a pattern
 * (see core/messaging/messageFilter.ts). Stored as typed, trimmed.
 */
export const filterWords = sqliteTable(
  "filter_words",
  {
    deviceId: integer("device_id").notNull(),
    pattern: text("pattern").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.deviceId, t.pattern] })],
);

export type FilterWordRow = typeof filterWords.$inferSelect;

/** Whether the message filter is on, per radio. No row is off. */
export const filterSettings = sqliteTable("filter_settings", {
  deviceId: integer("device_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
});

/** Conversations that turned the message filter off for themselves. */
export const filterOptOuts = sqliteTable(
  "filter_opt_outs",
  {
    deviceId: integer("device_id").notNull(),
    conversationKey: text("conversation_key").notNull(),
  },
  (t) => [primaryKey({ columns: [t.deviceId, t.conversationKey] })],
);

/**
 * The whole schema. Hand-written (rather than drizzle-kit generated) so the
 * database bootstraps itself on first open without a build step; keep it in
 * step with the table definitions above (schema.test.ts checks the columns).
 */
export const SCHEMA_SQL: ReadonlyArray<string> = [
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

/**
 * Bookkeeping kept in the file next to `PRAGMA user_version`: the minimum
 * reader version (`min_reader_version`). A table rather than a header field
 * so it is self-describing and can take more keys; it is not part of
 * `SCHEMA_SQL`, because it describes the file rather than the data and is
 * managed by `schemaStatements` alone.
 */
export const SCHEMA_META_TABLE = "schema_meta";
export const MIN_READER_KEY = "min_reader_version";

const SCHEMA_META_SQL = `CREATE TABLE IF NOT EXISTS ${SCHEMA_META_TABLE} (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  )`;

/** Reads the floor back; `applySchema` runs it on a file newer than the app. */
export const READ_MIN_READER_SQL = `SELECT value FROM ${SCHEMA_META_TABLE} WHERE key = '${MIN_READER_KEY}'`;

const writeMinReader = (version: number, keepExisting: boolean): string =>
  keepExisting
    ? `INSERT OR IGNORE INTO ${SCHEMA_META_TABLE} (key, value) VALUES ('${MIN_READER_KEY}', ${version})`
    : `INSERT INTO ${SCHEMA_META_TABLE} (key, value) VALUES ('${MIN_READER_KEY}', ${version}) ON CONFLICT(key) DO UPDATE SET value = excluded.value`;

/** What `schemaStatements` builds towards; tests pass their own. */
export interface SchemaPlan {
  readonly version: number;
  /** The minimum reader version this version declares. */
  readonly minReader: number;
  /** The oldest version `migrations` can upgrade. */
  readonly firstMigratable: number;
  readonly sql: ReadonlyArray<string>;
  readonly migrations: Readonly<Record<number, ReadonlyArray<string>>>;
}

export const CURRENT_SCHEMA: SchemaPlan = {
  version: SCHEMA_VERSION,
  minReader: MIN_READER_VERSION,
  firstMigratable: FIRST_MIGRATABLE_VERSION,
  sql: SCHEMA_SQL,
  migrations: MIGRATIONS,
};

/**
 * The upgrade steps from `from` to `plan.version`, in order, or undefined
 * when there is no path: `from` is 0, older than `plan.firstMigratable`,
 * not older than the plan, or a step is missing.
 */
export const migrationSteps = (
  from: number,
  plan: SchemaPlan = CURRENT_SCHEMA,
): string[] | undefined => {
  if (from < plan.firstMigratable || from <= 0 || from >= plan.version) {
    return undefined;
  }
  const steps: string[] = [];
  for (let version = from; version < plan.version; version++) {
    const step = plan.migrations[version];
    if (!step) return undefined;
    steps.push(...step);
  }
  return steps;
};

/** What `schemaStatements` knows about the file it opens. */
export interface FileSchema {
  /** `PRAGMA user_version`; 0 for an empty file. */
  readonly version: number;
  /** User tables in it; needed unless the version matches. */
  readonly tables?: ReadonlyArray<string>;
  /** Its minimum reader version; needed when it is newer than the app. */
  readonly minReader?: number;
}

/**
 * What to run against a file, all in one transaction (see `applySchema`):
 *
 * - at the app's version: the idempotent DDL again, and the minimum reader
 *   version recorded if the file has none yet;
 * - at an older version with a step for every version up to the app's:
 *   those steps in order, the DDL, then both stamps;
 * - at a newer version whose minimum reader version the app meets (a
 *   reverted deploy, an old tab, a stale cached bundle): only the
 *   idempotent DDL, leaving the file's data and stamps alone;
 * - anything else (an empty file, an older version with no path, a newer
 *   one the app can't read): every table dropped, the schema created and
 *   both stamps written.
 *
 * Pure, so the rules are unit-tested without a database.
 */
export const schemaStatements = (
  file: FileSchema,
  plan: SchemaPlan = CURRENT_SCHEMA,
): string[] => {
  const stamps = [
    SCHEMA_META_SQL,
    writeMinReader(plan.minReader, false),
    `PRAGMA user_version = ${plan.version}`,
  ];
  if (file.version === plan.version) {
    return [...plan.sql, SCHEMA_META_SQL, writeMinReader(plan.minReader, true)];
  }
  if (
    file.version > plan.version &&
    file.minReader !== undefined &&
    file.minReader <= plan.version
  ) {
    return [...plan.sql];
  }
  const steps = migrationSteps(file.version, plan);
  if (steps) {
    return [...steps, ...plan.sql, ...stamps];
  }
  const drops = (file.tables ?? [])
    .filter((name) => !name.startsWith("sqlite_"))
    .map((name) => `DROP TABLE IF EXISTS "${name.replaceAll('"', '""')}"`);
  return [...drops, ...plan.sql, ...stamps];
};
