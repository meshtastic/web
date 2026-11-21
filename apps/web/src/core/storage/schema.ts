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
 * There are no migrations. The schema is stamped in `PRAGMA user_version`;
 * a database carrying any other version is wiped and recreated on open (see
 * `schemaStatements`). The file name is new as well, so a database written by
 * an older release is never opened at all.
 */
export const DATABASE_FILE = "meshtastic-app-v1.db";

/**
 * Bump whenever the DDL below changes; older databases are wiped.
 * schema.test.ts pins the DDL per version, so an edit without a bump fails.
 */
export const SCHEMA_VERSION = 1;

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
    transport INTEGER
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
];

/**
 * What to run against a database found at `currentVersion` holding
 * `existingTables` (user tables; `sqlite_*` internals are skipped). At the
 * current version the DDL is re-run idempotently; any other version (an empty
 * file is 0) has its tables dropped first, then the schema is created and
 * stamped. Pure, so the wipe rule is unit-tested without a database.
 */
export const schemaStatements = (
  currentVersion: number,
  existingTables: ReadonlyArray<string>,
): string[] => {
  if (currentVersion === SCHEMA_VERSION) {
    return [...SCHEMA_SQL];
  }
  const drops = existingTables
    .filter((name) => !name.startsWith("sqlite_"))
    .map((name) => `DROP TABLE IF EXISTS "${name.replaceAll('"', '""')}"`);
  return [...drops, ...SCHEMA_SQL, `PRAGMA user_version = ${SCHEMA_VERSION}`];
};
