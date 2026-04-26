import type { Node, NodesRepository } from "@meshtastic/sdk";
import { fromBinary, toBinary } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { and, eq } from "drizzle-orm";
import type { SqlocalDb } from "../db.ts";
import { nodes } from "../schema/nodes.ts";

export interface SqlocalNodesRepositoryOptions {
  deviceId: number;
}

/**
 * Persists the snapshot of the device's NodeDB. user/position/metrics are
 * stored as base64-encoded protobuf bytes — round-trip safe across schema
 * additions because the wire shape is the source of truth.
 */
export class SqlocalNodesRepository implements NodesRepository {
  private readonly db: SqlocalDb;
  private readonly deviceId: number;

  constructor(db: SqlocalDb, options: SqlocalNodesRepositoryOptions) {
    this.db = db;
    this.deviceId = options.deviceId;
  }

  async loadAll(): Promise<Node[]> {
    const rows = await this.db.select().from(nodes).where(eq(nodes.deviceId, this.deviceId));
    return rows.map(rowToNode);
  }

  async get(nodeNum: number): Promise<Node | undefined> {
    const rows = await this.db
      .select()
      .from(nodes)
      .where(and(eq(nodes.deviceId, this.deviceId), eq(nodes.num, nodeNum))!)
      .limit(1);
    return rows[0] ? rowToNode(rows[0]) : undefined;
  }

  async upsert(node: Node): Promise<void> {
    await this.upsertBatch([node]);
  }

  async upsertBatch(input: ReadonlyArray<Node>): Promise<void> {
    if (input.length === 0) return;
    for (const node of input) {
      const row = nodeToRow(this.deviceId, node);
      await this.db
        .insert(nodes)
        .values(row)
        .onConflictDoUpdate({
          target: [nodes.deviceId, nodes.num],
          set: {
            lastHeard: row.lastHeard,
            snr: row.snr,
            isFavorite: row.isFavorite,
            isIgnored: row.isIgnored,
            userJson: row.userJson,
            positionJson: row.positionJson,
            metricsJson: row.metricsJson,
          },
        });
    }
  }

  async remove(nodeNum: number): Promise<void> {
    await this.db
      .delete(nodes)
      .where(and(eq(nodes.deviceId, this.deviceId), eq(nodes.num, nodeNum))!);
  }

  async clear(): Promise<void> {
    await this.db.delete(nodes).where(eq(nodes.deviceId, this.deviceId));
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
      ? fromBinary(Protobuf.Telemetry.DeviceMetricsSchema, base64Decode(row.metricsJson))
      : undefined,
    lastHeard: row.lastHeard ?? undefined,
    snr: row.snr ?? undefined,
    isFavorite: row.isFavorite,
    isIgnored: row.isIgnored,
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
    userJson: node.user ? base64Encode(toBinary(Protobuf.Mesh.UserSchema, node.user)) : null,
    positionJson: node.position
      ? base64Encode(toBinary(Protobuf.Mesh.PositionSchema, node.position))
      : null,
    metricsJson: node.deviceMetrics
      ? base64Encode(toBinary(Protobuf.Telemetry.DeviceMetricsSchema, node.deviceMetrics))
      : null,
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
