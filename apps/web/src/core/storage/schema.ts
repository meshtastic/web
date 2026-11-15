import type { Protobuf } from "@core/protobuf.ts";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { MessageState } from "./types.ts";

export const messages = sqliteTable(
  "messages",
  {
    /**
     * Composite primary key would be ideal, but Meshtastic packet IDs are
     * already 32-bit random values; collisions across devices are rare. We
     * scope reads by (device_id, conversation_key) so collisions only
     * matter within a single device's history.
     */
    id: integer("id").notNull(),
    deviceId: integer("device_id").notNull(),
    conversationKey: text("conversation_key").notNull(),
    fromNode: integer("from_node").notNull(),
    toNode: integer("to_node").notNull(),
    channel: integer("channel").notNull(),
    rxTime: integer("rx_time").notNull(),
    type: text("type", { enum: ["broadcast", "direct"] }).notNull(),
    text: text("text").notNull(),
    state: text("state", {
      enum: [
        MessageState.Pending,
        MessageState.Delivered,
        MessageState.Ack,
        MessageState.Failed,
      ],
    }).notNull(),
    signed: integer("signed", { mode: "boolean" }),
    ackProof:
      integer("ack_proof").$type<Protobuf.Mesh.MeshPacket_AckProofStatus>(),
    routingError: integer("routing_error").$type<Protobuf.Mesh.Routing_Error>(),
    relays: integer("relays"),
    snr: real("snr"),
    rssi: integer("rssi"),
    hopsAway: integer("hops_away"),
    viaMqtt: integer("via_mqtt", { mode: "boolean" }),
    transport:
      integer("transport").$type<Protobuf.Mesh.MeshPacket_TransportMechanism>(),
  },
  (t) => ({
    pk: index("messages_pk").on(t.deviceId, t.id),
    convRxTime: index("idx_messages_conv_rxtime").on(
      t.deviceId,
      t.conversationKey,
      t.rxTime,
    ),
    pending: index("idx_messages_pending").on(t.deviceId, t.state),
  }),
);

export type MessageRow = typeof messages.$inferSelect;
export type MessageInsert = typeof messages.$inferInsert;

export const drafts = sqliteTable(
  "drafts",
  {
    deviceId: integer("device_id").notNull(),
    conversationKey: text("conversation_key").notNull(),
    text: text("text").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.deviceId, t.conversationKey] }),
  }),
);

export type DraftRow = typeof drafts.$inferSelect;
export type DraftInsert = typeof drafts.$inferInsert;

/**
 * Snapshot of the device's NodeDB. Position / metrics / user are stored as
 * JSON blobs (proto-shape) — slice infrastructure mappers are responsible
 * for serialization. Last-heard duplicates the column for sortable indexes.
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
  (t) => ({
    pk: primaryKey({ columns: [t.deviceId, t.num] }),
    lastHeardIdx: index("idx_nodes_last_heard").on(t.deviceId, t.lastHeard),
  }),
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
  (t) => ({
    nodeTs: index("idx_telemetry_node_ts").on(t.deviceId, t.nodeNum, t.ts),
  }),
);

export type TelemetryRow = typeof telemetry.$inferSelect;
export type TelemetryInsert = typeof telemetry.$inferInsert;

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
    // Firmware 2.8: XEdDSA-signed messages, ack proof of delivery, and why
    // a message failed and how many acks it got.
    version: 3,
    sql: [
      `ALTER TABLE messages ADD COLUMN signed INTEGER`,
      `ALTER TABLE messages ADD COLUMN ack_proof INTEGER`,
      `ALTER TABLE messages ADD COLUMN routing_error INTEGER`,
      `ALTER TABLE messages ADD COLUMN relays INTEGER`,
    ],
  },
  {
    // How a received message reached us: signal, hops and transport.
    version: 4,
    sql: [
      `ALTER TABLE messages ADD COLUMN snr REAL`,
      `ALTER TABLE messages ADD COLUMN rssi INTEGER`,
      `ALTER TABLE messages ADD COLUMN hops_away INTEGER`,
      `ALTER TABLE messages ADD COLUMN via_mqtt INTEGER`,
      `ALTER TABLE messages ADD COLUMN transport INTEGER`,
    ],
  },
];
