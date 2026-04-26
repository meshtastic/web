import { fromBinary, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import type {
  TelemetryReading,
  TelemetryRepository,
  TelemetryRetentionPolicy,
} from "@meshtastic/sdk";
import { and, asc, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import type { SqlocalDb } from "../db.ts";
import { telemetry } from "../schema/telemetry.ts";

export interface SqlocalTelemetryRepositoryOptions {
  deviceId: number;
}

const SCHEMA_FOR_KIND = {
  deviceMetrics: Protobuf.Telemetry.DeviceMetricsSchema,
  environmentMetrics: Protobuf.Telemetry.EnvironmentMetricsSchema,
  airQualityMetrics: Protobuf.Telemetry.AirQualityMetricsSchema,
  powerMetrics: Protobuf.Telemetry.PowerMetricsSchema,
  localStats: Protobuf.Telemetry.LocalStatsSchema,
  healthMetrics: Protobuf.Telemetry.HealthMetricsSchema,
  hostMetrics: Protobuf.Telemetry.HostMetricsSchema,
} as const;

type KnownKind = keyof typeof SCHEMA_FOR_KIND;

export class SqlocalTelemetryRepository implements TelemetryRepository {
  private readonly db: SqlocalDb;
  private readonly deviceId: number;

  constructor(db: SqlocalDb, options: SqlocalTelemetryRepositoryOptions) {
    this.db = db;
    this.deviceId = options.deviceId;
  }

  async loadRecent(nodeNum: number, limit: number): Promise<TelemetryReading[]> {
    const rows = await this.db
      .select()
      .from(telemetry)
      .where(and(eq(telemetry.deviceId, this.deviceId), eq(telemetry.nodeNum, nodeNum))!)
      .orderBy(desc(telemetry.ts))
      .limit(limit);
    return rows.map(rowToReading).reverse();
  }

  async loadBefore(nodeNum: number, cursor: Date, limit: number): Promise<TelemetryReading[]> {
    const rows = await this.db
      .select()
      .from(telemetry)
      .where(
        and(
          eq(telemetry.deviceId, this.deviceId),
          eq(telemetry.nodeNum, nodeNum),
          lt(telemetry.ts, cursor.getTime()),
        )!,
      )
      .orderBy(desc(telemetry.ts))
      .limit(limit);
    return rows.map(rowToReading).reverse();
  }

  async append(reading: TelemetryReading): Promise<void> {
    await this.appendBatch([reading]);
  }

  async appendBatch(readings: ReadonlyArray<TelemetryReading>): Promise<void> {
    if (readings.length === 0) return;
    const rows = readings
      .map((r) => readingToRow(this.deviceId, r))
      .filter((r): r is TelemetryRow => r !== null);
    if (rows.length === 0) return;
    await this.db.insert(telemetry).values(rows);
  }

  async prune(policy: TelemetryRetentionPolicy): Promise<void> {
    if (policy.olderThanMs !== undefined) {
      const cutoff = Date.now() - policy.olderThanMs;
      await this.db
        .delete(telemetry)
        .where(and(eq(telemetry.deviceId, this.deviceId), lt(telemetry.ts, cutoff))!);
    }
    if (policy.maxPerNode !== undefined) {
      const max = policy.maxPerNode;
      // Get distinct nodes that exceed the cap, then trim each.
      const overCap = await this.db
        .select({ nodeNum: telemetry.nodeNum, c: count() })
        .from(telemetry)
        .where(eq(telemetry.deviceId, this.deviceId))
        .groupBy(telemetry.nodeNum)
        .having(sql`count(*) > ${max}`);
      for (const row of overCap) {
        // Keep the newest `max` rows; delete everything older than the
        // ts-of-the-(max+1)th-newest. ts ASC; offset by max-th gives cutoff.
        const cutoffRows = await this.db
          .select({ ts: telemetry.ts })
          .from(telemetry)
          .where(and(eq(telemetry.deviceId, this.deviceId), eq(telemetry.nodeNum, row.nodeNum))!)
          .orderBy(desc(telemetry.ts))
          .limit(1)
          .offset(max - 1);
        const cutoff = cutoffRows[0]?.ts;
        if (cutoff === undefined) continue;
        await this.db
          .delete(telemetry)
          .where(
            and(
              eq(telemetry.deviceId, this.deviceId),
              eq(telemetry.nodeNum, row.nodeNum),
              lt(telemetry.ts, cutoff),
            )!,
          );
      }
    }
    void asc; // silence unused import without breaking the export shape
    void gte;
  }

  async clearNode(nodeNum: number): Promise<void> {
    await this.db
      .delete(telemetry)
      .where(and(eq(telemetry.deviceId, this.deviceId), eq(telemetry.nodeNum, nodeNum))!);
  }

  async clear(): Promise<void> {
    await this.db.delete(telemetry).where(eq(telemetry.deviceId, this.deviceId));
  }
}

interface TelemetryRow {
  deviceId: number;
  nodeNum: number;
  kind: string;
  ts: number;
  payloadJson: string;
}

function readingToRow(deviceId: number, reading: TelemetryReading): TelemetryRow | null {
  if (!reading.kind) return null;
  const schema = SCHEMA_FOR_KIND[reading.kind as KnownKind];
  if (!schema) return null;
  return {
    deviceId,
    nodeNum: reading.nodeNum,
    kind: reading.kind,
    ts: reading.time.getTime(),
    payloadJson: base64Encode(toBinary(schema, reading.value as never)),
  };
}

function rowToReading(row: {
  nodeNum: number;
  kind: string;
  ts: number;
  payloadJson: string;
}): TelemetryReading {
  const kind = row.kind as KnownKind;
  const schema = SCHEMA_FOR_KIND[kind];
  const value = schema
    ? fromBinary(schema, base64Decode(row.payloadJson))
    : (undefined as unknown as TelemetryReading["value"]);
  return {
    nodeNum: row.nodeNum,
    time: new Date(row.ts),
    kind,
    value: value as TelemetryReading["value"],
  };
}

function base64Encode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function base64Decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
