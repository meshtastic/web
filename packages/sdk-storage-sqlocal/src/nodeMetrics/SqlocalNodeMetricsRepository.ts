import { and, count, desc, eq, lt, sql } from "drizzle-orm";
import type { SqlocalDb } from "../db.ts";
import { nodeMetrics } from "../schema/nodeMetrics.ts";

export interface SqlocalNodeMetricsRepositoryOptions {
  /** Identifies the connection (matches MeshRegistry ConnectionId). */
  deviceId: number;
}

/** A single per-node metric sample. */
export interface NodeMetricSample {
  nodeNum: number;
  /** camelCase metric name, e.g. "snr", "hopsAway", "lastHeard". */
  metric: string;
  time: Date;
  value: number;
}

/** Retention policy for node-metric samples. */
export interface NodeMetricsRetentionPolicy {
  /** Drop samples older than this many milliseconds. */
  olderThanMs?: number;
  /** Keep at most this many samples per (node, metric). */
  maxPerMetric?: number;
}

/**
 * Persists per-node metric time series (SNR, hops away, last heard, …) that
 * are not carried by Telemetry packets. Scoped by `deviceId` so history from
 * different connections never mixes.
 */
export class SqlocalNodeMetricsRepository {
  private readonly db: SqlocalDb;
  private readonly deviceId: number;

  constructor(db: SqlocalDb, options: SqlocalNodeMetricsRepositoryOptions) {
    this.db = db;
    this.deviceId = options.deviceId;
  }

  async append(sample: NodeMetricSample): Promise<void> {
    await this.appendBatch([sample]);
  }

  async appendBatch(samples: ReadonlyArray<NodeMetricSample>): Promise<void> {
    if (samples.length === 0) return;
    const rows = samples.map((s) => ({
      deviceId: this.deviceId,
      nodeNum: s.nodeNum,
      metric: s.metric,
      ts: s.time.getTime(),
      value: s.value,
    }));
    await this.db.insert(nodeMetrics).values(rows);
  }

  /** Most recent `limit` samples for a node, across all metrics, ascending. */
  async loadRecent(
    nodeNum: number,
    limit: number,
  ): Promise<NodeMetricSample[]> {
    const rows = await this.db
      .select()
      .from(nodeMetrics)
      .where(
        and(
          eq(nodeMetrics.deviceId, this.deviceId),
          eq(nodeMetrics.nodeNum, nodeNum),
        )!,
      )
      .orderBy(desc(nodeMetrics.ts))
      .limit(limit);
    return rows.map(rowToSample).reverse();
  }

  /** The distinct metric names recorded for a node. */
  async metricsFor(nodeNum: number): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ metric: nodeMetrics.metric })
      .from(nodeMetrics)
      .where(
        and(
          eq(nodeMetrics.deviceId, this.deviceId),
          eq(nodeMetrics.nodeNum, nodeNum),
        )!,
      );
    return rows.map((r) => r.metric).sort();
  }

  async prune(policy: NodeMetricsRetentionPolicy): Promise<void> {
    if (policy.olderThanMs !== undefined) {
      const cutoff = Date.now() - policy.olderThanMs;
      await this.db
        .delete(nodeMetrics)
        .where(
          and(
            eq(nodeMetrics.deviceId, this.deviceId),
            lt(nodeMetrics.ts, cutoff),
          )!,
        );
    }
    if (policy.maxPerMetric !== undefined) {
      const max = policy.maxPerMetric;
      // Trim each over-cap (node, metric) bucket down to the newest `max` rows.
      const overCap = await this.db
        .select({
          nodeNum: nodeMetrics.nodeNum,
          metric: nodeMetrics.metric,
          c: count(),
        })
        .from(nodeMetrics)
        .where(eq(nodeMetrics.deviceId, this.deviceId))
        .groupBy(nodeMetrics.nodeNum, nodeMetrics.metric)
        .having(sql`count(*) > ${max}`);
      for (const row of overCap) {
        const cutoffRows = await this.db
          .select({ ts: nodeMetrics.ts })
          .from(nodeMetrics)
          .where(
            and(
              eq(nodeMetrics.deviceId, this.deviceId),
              eq(nodeMetrics.nodeNum, row.nodeNum),
              eq(nodeMetrics.metric, row.metric),
            )!,
          )
          .orderBy(desc(nodeMetrics.ts))
          .limit(1)
          .offset(max - 1);
        const cutoff = cutoffRows[0]?.ts;
        if (cutoff === undefined) continue;
        await this.db
          .delete(nodeMetrics)
          .where(
            and(
              eq(nodeMetrics.deviceId, this.deviceId),
              eq(nodeMetrics.nodeNum, row.nodeNum),
              eq(nodeMetrics.metric, row.metric),
              lt(nodeMetrics.ts, cutoff),
            )!,
          );
      }
    }
  }

  async clearNode(nodeNum: number): Promise<void> {
    await this.db
      .delete(nodeMetrics)
      .where(
        and(
          eq(nodeMetrics.deviceId, this.deviceId),
          eq(nodeMetrics.nodeNum, nodeNum),
        )!,
      );
  }

  async clear(): Promise<void> {
    await this.db
      .delete(nodeMetrics)
      .where(eq(nodeMetrics.deviceId, this.deviceId));
  }
}

function rowToSample(row: {
  nodeNum: number;
  metric: string;
  ts: number;
  value: number;
}): NodeMetricSample {
  return {
    nodeNum: row.nodeNum,
    metric: row.metric,
    time: new Date(row.ts),
    value: row.value,
  };
}
