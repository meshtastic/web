import { fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { and, count, desc, eq, lt, sql } from "drizzle-orm";
import type { SqlocalDb } from "./db.ts";
import { telemetry } from "./schema.ts";
import { type ScopeOptions, type StorageScope, scopeOf } from "./scope.ts";
import {
  base64Decode,
  base64Encode,
  type TelemetryReading,
  type TelemetryRepository,
  type TelemetryRetentionPolicy,
} from "./types.ts";

/** The `device_id` rows are stored and read under (see `StorageScope`). */
export type SqlocalTelemetryRepositoryOptions = ScopeOptions;

export class SqlocalTelemetryRepository implements TelemetryRepository {
  private readonly db: SqlocalDb;
  private readonly scope: StorageScope;

  constructor(db: SqlocalDb, options: SqlocalTelemetryRepositoryOptions) {
    this.db = db;
    this.scope = scopeOf(options);
  }

  /**
   * Points every later read and write at another `device_id`. Rows under the
   * old one are left as they are.
   */
  setScope(deviceId: number): void {
    this.scope.set(deviceId);
  }

  loadRecent(nodeNum: number, limit: number): Promise<TelemetryReading[]> {
    return this.scope.run(async (deviceId) => {
      const rows = await this.db
        .select()
        .from(telemetry)
        .where(
          and(eq(telemetry.deviceId, deviceId), eq(telemetry.nodeNum, nodeNum)),
        )
        .orderBy(desc(telemetry.ts))
        .limit(limit);
      return rows.flatMap((row) => rowToReading(row) ?? []).reverse();
    });
  }

  loadBefore(
    nodeNum: number,
    cursor: Date,
    limit: number,
  ): Promise<TelemetryReading[]> {
    return this.scope.run(async (deviceId) => {
      const rows = await this.db
        .select()
        .from(telemetry)
        .where(
          and(
            eq(telemetry.deviceId, deviceId),
            eq(telemetry.nodeNum, nodeNum),
            lt(telemetry.ts, cursor.getTime()),
          ),
        )
        .orderBy(desc(telemetry.ts))
        .limit(limit);
      return rows.flatMap((row) => rowToReading(row) ?? []).reverse();
    });
  }

  append(reading: TelemetryReading): Promise<void> {
    return this.appendBatch([reading]);
  }

  appendBatch(readings: ReadonlyArray<TelemetryReading>): Promise<void> {
    return this.scope.run(async (deviceId) => {
      if (readings.length === 0) return;
      const rows = readings.flatMap((r) => readingToRow(deviceId, r) ?? []);
      if (rows.length === 0) return;
      await this.db.insert(telemetry).values(rows);
    });
  }

  prune(policy: TelemetryRetentionPolicy): Promise<void> {
    return this.scope.run(async (deviceId) => {
      if (policy.olderThanMs !== undefined) {
        const cutoff = Date.now() - policy.olderThanMs;
        await this.db
          .delete(telemetry)
          .where(
            and(eq(telemetry.deviceId, deviceId), lt(telemetry.ts, cutoff)),
          );
      }
      if (policy.maxPerNode !== undefined) {
        const max = policy.maxPerNode;
        // Get distinct nodes that exceed the cap, then trim each.
        const overCap = await this.db
          .select({ nodeNum: telemetry.nodeNum, c: count() })
          .from(telemetry)
          .where(eq(telemetry.deviceId, deviceId))
          .groupBy(telemetry.nodeNum)
          .having(sql`count(*) > ${max}`);
        for (const row of overCap) {
          // Keep the newest `max` rows; delete everything older than the
          // ts-of-the-(max+1)th-newest. ts ASC; offset by max-th gives cutoff.
          const cutoffRows = await this.db
            .select({ ts: telemetry.ts })
            .from(telemetry)
            .where(
              and(
                eq(telemetry.deviceId, deviceId),
                eq(telemetry.nodeNum, row.nodeNum),
              ),
            )
            .orderBy(desc(telemetry.ts))
            .limit(1)
            .offset(max - 1);
          const cutoff = cutoffRows[0]?.ts;
          if (cutoff === undefined) continue;
          await this.db
            .delete(telemetry)
            .where(
              and(
                eq(telemetry.deviceId, deviceId),
                eq(telemetry.nodeNum, row.nodeNum),
                lt(telemetry.ts, cutoff),
              ),
            );
        }
      }
    });
  }

  clearNode(nodeNum: number): Promise<void> {
    return this.scope.run(async (deviceId) => {
      await this.db
        .delete(telemetry)
        .where(
          and(eq(telemetry.deviceId, deviceId), eq(telemetry.nodeNum, nodeNum)),
        );
    });
  }

  clear(): Promise<void> {
    return this.scope.run(async (deviceId) => {
      await this.db.delete(telemetry).where(eq(telemetry.deviceId, deviceId));
    });
  }
}

type TelemetryRow = typeof telemetry.$inferInsert;

function readingToRow(
  deviceId: number,
  reading: TelemetryReading,
): TelemetryRow | undefined {
  const payload = encodeValue(reading.value);
  if (!reading.kind || !payload) return undefined;
  return {
    deviceId,
    nodeNum: reading.nodeNum,
    kind: reading.kind,
    ts: reading.time.getTime(),
    payloadJson: base64Encode(payload),
  };
}

function encodeValue(value: TelemetryReading["value"]): Uint8Array | undefined {
  switch (value?.$typeName) {
    case "meshtastic.DeviceMetrics":
      return toBinary(Protobuf.Telemetry.DeviceMetricsSchema, value);
    case "meshtastic.EnvironmentMetrics":
      return toBinary(Protobuf.Telemetry.EnvironmentMetricsSchema, value);
    case "meshtastic.AirQualityMetrics":
      return toBinary(Protobuf.Telemetry.AirQualityMetricsSchema, value);
    case "meshtastic.PowerMetrics":
      return toBinary(Protobuf.Telemetry.PowerMetricsSchema, value);
    case "meshtastic.LocalStats":
      return toBinary(Protobuf.Telemetry.LocalStatsSchema, value);
    case "meshtastic.HealthMetrics":
      return toBinary(Protobuf.Telemetry.HealthMetricsSchema, value);
    case "meshtastic.HostMetrics":
      return toBinary(Protobuf.Telemetry.HostMetricsSchema, value);
    default:
      return undefined;
  }
}

function rowToReading(row: {
  nodeNum: number;
  kind: string;
  ts: number;
  payloadJson: string;
}): TelemetryReading | undefined {
  const base = { nodeNum: row.nodeNum, time: new Date(row.ts) };
  const bytes = base64Decode(row.payloadJson);
  switch (row.kind) {
    case "deviceMetrics":
      return {
        ...base,
        kind: row.kind,
        value: fromBinary(Protobuf.Telemetry.DeviceMetricsSchema, bytes),
      };
    case "environmentMetrics":
      return {
        ...base,
        kind: row.kind,
        value: fromBinary(Protobuf.Telemetry.EnvironmentMetricsSchema, bytes),
      };
    case "airQualityMetrics":
      return {
        ...base,
        kind: row.kind,
        value: fromBinary(Protobuf.Telemetry.AirQualityMetricsSchema, bytes),
      };
    case "powerMetrics":
      return {
        ...base,
        kind: row.kind,
        value: fromBinary(Protobuf.Telemetry.PowerMetricsSchema, bytes),
      };
    case "localStats":
      return {
        ...base,
        kind: row.kind,
        value: fromBinary(Protobuf.Telemetry.LocalStatsSchema, bytes),
      };
    case "healthMetrics":
      return {
        ...base,
        kind: row.kind,
        value: fromBinary(Protobuf.Telemetry.HealthMetricsSchema, bytes),
      };
    case "hostMetrics":
      return {
        ...base,
        kind: row.kind,
        value: fromBinary(Protobuf.Telemetry.HostMetricsSchema, bytes),
      };
    default:
      return undefined;
  }
}
