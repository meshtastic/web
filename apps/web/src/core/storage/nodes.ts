import { fromBinary, toBinary } from "@bufbuild/protobuf";
import { Protobuf } from "@core/protobuf.ts";
import { and, eq, sql } from "drizzle-orm";
import type { SqlocalDb } from "./db.ts";
import { nodes } from "./schema.ts";
import { type ScopeOptions, type StorageScope, scopeOf } from "./scope.ts";
import {
  base64Decode,
  base64Encode,
  type Node,
  type NodesRepository,
} from "./types.ts";

/** The `device_id` rows are stored and read under (see `StorageScope`). */
export type SqlocalNodesRepositoryOptions = ScopeOptions;

/** Rows per INSERT: 16 bound values each, well inside SQLite's variable limit. */
const UPSERT_CHUNK = 500;

/**
 * Persists the snapshot of the device's NodeDB. user/position/metrics are
 * stored as base64-encoded protobuf bytes — round-trip safe across schema
 * additions because the wire shape is the source of truth. The other
 * NodeInfo fields are plain columns. `heardOnCurrentLora` is not stored:
 * it holds only for the LoRa settings the radio had when it said so, so a
 * cached node reads back without it (counted as heard) until the radio's
 * node DB arrives.
 */
export class SqlocalNodesRepository implements NodesRepository {
  private readonly db: SqlocalDb;
  private readonly scope: StorageScope;

  constructor(db: SqlocalDb, options: SqlocalNodesRepositoryOptions) {
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

  loadAll(): Promise<Node[]> {
    return this.scope.run(async (deviceId) => {
      const rows = await this.db
        .select()
        .from(nodes)
        .where(eq(nodes.deviceId, deviceId));
      return rows.map(rowToNode);
    });
  }

  get(nodeNum: number): Promise<Node | undefined> {
    return this.scope.run(async (deviceId) => {
      const rows = await this.db
        .select()
        .from(nodes)
        .where(and(eq(nodes.deviceId, deviceId), eq(nodes.num, nodeNum)))
        .limit(1);
      return rows[0] ? rowToNode(rows[0]) : undefined;
    });
  }

  upsert(node: Node): Promise<void> {
    return this.upsertBatch([node]);
  }

  /** One multi-row statement per chunk, so a large node DB is a few worker round trips, not one per node. */
  upsertBatch(input: ReadonlyArray<Node>): Promise<void> {
    return this.scope.run(async (deviceId) => {
      for (let i = 0; i < input.length; i += UPSERT_CHUNK) {
        const rows = input
          .slice(i, i + UPSERT_CHUNK)
          .map((node) => nodeToRow(deviceId, node));
        await this.db
          .insert(nodes)
          .values(rows)
          .onConflictDoUpdate({
            target: [nodes.deviceId, nodes.num],
            set: {
              lastHeard: sql`excluded.last_heard`,
              snr: sql`excluded.snr`,
              isFavorite: sql`excluded.is_favorite`,
              isIgnored: sql`excluded.is_ignored`,
              userJson: sql`excluded.user_json`,
              positionJson: sql`excluded.position_json`,
              metricsJson: sql`excluded.metrics_json`,
              channel: sql`excluded.channel`,
              viaMqtt: sql`excluded.via_mqtt`,
              hopsAway: sql`excluded.hops_away`,
              isKeyManuallyVerified: sql`excluded.is_key_manually_verified`,
              isMuted: sql`excluded.is_muted`,
              hasXeddsaSigned: sql`excluded.has_xeddsa_signed`,
              status: sql`excluded.status`,
            },
          });
      }
    });
  }

  remove(nodeNum: number): Promise<void> {
    return this.scope.run(async (deviceId) => {
      await this.db
        .delete(nodes)
        .where(and(eq(nodes.deviceId, deviceId), eq(nodes.num, nodeNum)));
    });
  }

  clear(): Promise<void> {
    return this.scope.run(async (deviceId) => {
      await this.db.delete(nodes).where(eq(nodes.deviceId, deviceId));
    });
  }
}

interface NodeRow {
  deviceId: number;
  num: number;
  lastHeard: number | null;
  snr: number | null;
  isFavorite: boolean;
  isIgnored: boolean;
  userJson: string | null;
  positionJson: string | null;
  metricsJson: string | null;
  channel: number | null;
  viaMqtt: boolean | null;
  hopsAway: number | null;
  isKeyManuallyVerified: boolean | null;
  isMuted: boolean | null;
  hasXeddsaSigned: boolean | null;
  status: string | null;
}

function rowToNode(row: NodeRow): Node {
  return {
    num: row.num,
    user: row.userJson
      ? fromBinary(Protobuf.Mesh.UserSchema, base64Decode(row.userJson))
      : undefined,
    position: row.positionJson
      ? fromBinary(Protobuf.Mesh.PositionSchema, base64Decode(row.positionJson))
      : undefined,
    deviceMetrics: row.metricsJson
      ? fromBinary(
          Protobuf.Telemetry.DeviceMetricsSchema,
          base64Decode(row.metricsJson),
        )
      : undefined,
    lastHeard: row.lastHeard ?? undefined,
    snr: row.snr ?? undefined,
    isFavorite: row.isFavorite,
    isIgnored: row.isIgnored,
    channel: row.channel ?? undefined,
    viaMqtt: row.viaMqtt ?? undefined,
    hopsAway: row.hopsAway ?? undefined,
    isKeyManuallyVerified: row.isKeyManuallyVerified ?? undefined,
    isMuted: row.isMuted ?? undefined,
    hasXeddsaSigned: row.hasXeddsaSigned ?? undefined,
    status: row.status ?? undefined,
  };
}

function nodeToRow(deviceId: number, node: Node): NodeRow {
  return {
    deviceId,
    num: node.num,
    lastHeard: node.lastHeard ?? null,
    snr: node.snr ?? null,
    isFavorite: node.isFavorite,
    isIgnored: node.isIgnored,
    userJson: node.user
      ? base64Encode(toBinary(Protobuf.Mesh.UserSchema, node.user))
      : null,
    positionJson: node.position
      ? base64Encode(toBinary(Protobuf.Mesh.PositionSchema, node.position))
      : null,
    metricsJson: node.deviceMetrics
      ? base64Encode(
          toBinary(Protobuf.Telemetry.DeviceMetricsSchema, node.deviceMetrics),
        )
      : null,
    channel: node.channel ?? null,
    viaMqtt: node.viaMqtt ?? null,
    hopsAway: node.hopsAway ?? null,
    isKeyManuallyVerified: node.isKeyManuallyVerified ?? null,
    isMuted: node.isMuted ?? null,
    hasXeddsaSigned: node.hasXeddsaSigned ?? null,
    status: node.status ?? null,
  };
}
