import {
  index,
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * Time series of per-node metrics that are NOT carried by Telemetry packets —
 * the node-level values surfaced on the Nodes page (SNR, hops away, last
 * heard). Telemetry-packet metrics (battery, voltage, etc.) live in the
 * `telemetry` table; this table complements it so the Telemetry page can chart
 * every metric a node exposes.
 *
 * `metric` is the camelCase field name (e.g. "snr", "hopsAway", "lastHeard").
 * `value` is stored as a REAL since these span integers and floats.
 */
export const nodeMetrics = sqliteTable(
  "node_metrics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deviceId: integer("device_id").notNull(),
    nodeNum: integer("node_num").notNull(),
    metric: text("metric").notNull(),
    ts: integer("ts").notNull(),
    value: real("value").notNull(),
  },
  (t) => ({
    nodeMetricTs: index("idx_node_metrics_node_metric_ts").on(
      t.deviceId,
      t.nodeNum,
      t.metric,
      t.ts,
    ),
  }),
);

export type NodeMetricRow = typeof nodeMetrics.$inferSelect;
export type NodeMetricInsert = typeof nodeMetrics.$inferInsert;
