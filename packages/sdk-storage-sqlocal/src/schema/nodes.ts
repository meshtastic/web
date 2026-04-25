import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
    isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
    isIgnored: integer("is_ignored", { mode: "boolean" }).notNull().default(false),
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
