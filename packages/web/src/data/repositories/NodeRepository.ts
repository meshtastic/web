import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { dbClient } from "../client.ts";
import {
  type NewNode,
  type NewPositionLog,
  type NewTelemetryLog,
  type Node,
  nodes,
  type PositionLog,
  positionLogs,
  type TelemetryLog,
  telemetryLogs,
} from "../schema.ts";

const ONLINE_THRESHOLD_SECONDS = 900;

export class NodeRepository {
  private get db() {
    return dbClient.db;
  }

  getClient(client?: SQLocalDrizzle) {
    return client ?? dbClient.client;
  }

  private nodeCondition(ownerNodeNum: number, nodeNum: number) {
    return and(
      eq(nodes.ownerNodeNum, ownerNodeNum),
      eq(nodes.nodeNum, nodeNum),
    );
  }

  private staleNodesCondition(
    ownerNodeNum: number,
    daysOld: number,
    unknownOnly: boolean,
  ) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const conditions = [
      eq(nodes.ownerNodeNum, ownerNodeNum),
      lt(nodes.lastHeard, cutoffDate),
    ];

    if (unknownOnly) {
      conditions.push(or(isNull(nodes.longName), eq(nodes.longName, "")));
    }

    return and(...conditions);
  }

  private positionLogsCondition(
    ownerNodeNum: number,
    nodeNum: number,
    sinceMs?: number,
  ) {
    const conditions = [
      eq(positionLogs.ownerNodeNum, ownerNodeNum),
      eq(positionLogs.nodeNum, nodeNum),
    ];

    if (sinceMs !== undefined) {
      conditions.push(gt(positionLogs.time, new Date(sinceMs)));
    }

    return and(...conditions);
  }

  private telemetryLogsCondition(
    ownerNodeNum: number,
    nodeNum: number,
    sinceMs?: number,
  ) {
    const conditions = [
      eq(telemetryLogs.ownerNodeNum, ownerNodeNum),
      eq(telemetryLogs.nodeNum, nodeNum),
    ];

    if (sinceMs !== undefined) {
      conditions.push(gt(telemetryLogs.time, new Date(sinceMs)));
    }

    return and(...conditions);
  }

  private async countAndDelete(
    countFn: () => Promise<number>,
    deleteFn: () => Promise<void>,
  ): Promise<number> {
    const count = await countFn();
    if (count > 0) {
      await deleteFn();
    }
    return count;
  }

  buildNodesQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(nodes)
      .where(eq(nodes.ownerNodeNum, ownerNodeNum));
  }

  buildOnlineNodesQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(nodes)
      .where(
        and(
          eq(nodes.ownerNodeNum, ownerNodeNum),
          isNotNull(nodes.lastHeard),
          gt(nodes.lastHeard, sql`unixepoch() - ${ONLINE_THRESHOLD_SECONDS}`),
        ),
      );
  }

  buildPositionHistoryQuery(
    ownerNodeNum: number,
    nodeNum: number,
    sinceMs?: number,
    limit = 100,
  ) {
    return this.db
      .select()
      .from(positionLogs)
      .where(this.positionLogsCondition(ownerNodeNum, nodeNum, sinceMs))
      .orderBy(desc(positionLogs.time))
      .limit(limit);
  }

  buildTelemetryHistoryQuery(
    ownerNodeNum: number,
    nodeNum: number,
    sinceMs?: number,
    limit = 100,
  ) {
    return this.db
      .select()
      .from(telemetryLogs)
      .where(this.telemetryLogsCondition(ownerNodeNum, nodeNum, sinceMs))
      .orderBy(desc(telemetryLogs.time))
      .limit(limit);
  }

  async getOnlineNodeCount(deviceId: number): Promise<number> {
    const result = await this.buildOnlineNodesQuery(deviceId);
    return result.length;
  }

  async getNodes(ownerNodeNum: number): Promise<Node[]> {
    return this.db
      .select()
      .from(nodes)
      .where(eq(nodes.ownerNodeNum, ownerNodeNum))
      .orderBy(desc(nodes.lastHeard));
  }

  async getNode(
    ownerNodeNum: number,
    nodeNum: number,
  ): Promise<Node | undefined> {
    const result = await this.db
      .select()
      .from(nodes)
      .where(this.nodeCondition(ownerNodeNum, nodeNum))
      .limit(1);

    return result[0];
  }

  async upsertNode(node: NewNode): Promise<void> {
    await this.db
      .insert(nodes)
      .values(node)
      .onConflictDoUpdate({
        target: [nodes.ownerNodeNum, nodes.nodeNum],
        set: {
          lastHeard: node.lastHeard,
          snr: node.snr,
          isFavorite: node.isFavorite ?? false,
          isIgnored: node.isIgnored ?? false,
          userId: node.userId,
          longName: node.longName,
          shortName: node.shortName,
          macaddr: node.macaddr,
          hwModel: node.hwModel,
          role: node.role,
          publicKey: node.publicKey,
          isLicensed: node.isLicensed,
          latitudeI: node.latitudeI,
          longitudeI: node.longitudeI,
          altitude: node.altitude,
          positionTime: node.positionTime,
          positionPrecisionBits: node.positionPrecisionBits,
          groundSpeed: node.groundSpeed,
          groundTrack: node.groundTrack,
          satsInView: node.satsInView,
          batteryLevel: node.batteryLevel,
          voltage: node.voltage,
          channelUtilization: node.channelUtilization,
          airUtilTx: node.airUtilTx,
          uptimeSeconds: node.uptimeSeconds,
          updatedAt: sql`(unixepoch() * 1000)`,
        },
      });
  }

  async updatePosition(
    ownerNodeNum: number,
    nodeNum: number,
    position: {
      latitudeI?: number;
      longitudeI?: number;
      altitude?: number;
      positionTime?: Date;
      positionPrecisionBits?: number;
      groundSpeed?: number;
      groundTrack?: number;
      satsInView?: number;
    },
  ): Promise<void> {
    await this.db
      .update(nodes)
      .set({
        ...position,
        updatedAt: new Date(),
      })
      .where(this.nodeCondition(ownerNodeNum, nodeNum));
  }

  async updateUser(
    ownerNodeNum: number,
    nodeNum: number,
    user: {
      userId?: string;
      longName?: string;
      shortName?: string;
      macaddr?: string;
      hwModel?: number;
      role?: number;
      publicKey?: string;
      isLicensed?: boolean;
    },
  ): Promise<void> {
    await this.db
      .update(nodes)
      .set({
        ...user,
        updatedAt: new Date(),
      })
      .where(this.nodeCondition(ownerNodeNum, nodeNum));
  }

  async updateMetrics(
    ownerNodeNum: number,
    nodeNum: number,
    metrics: {
      batteryLevel?: number;
      voltage?: number;
      channelUtilization?: number;
      airUtilTx?: number;
      uptimeSeconds?: number;
    },
  ): Promise<void> {
    await this.db
      .update(nodes)
      .set({
        ...metrics,
        updatedAt: new Date(),
      })
      .where(this.nodeCondition(ownerNodeNum, nodeNum));
  }

  async updateLastHeard(
    ownerNodeNum: number,
    nodeNum: number,
    lastHeardSec: number,
    snr?: number,
  ): Promise<void> {
    const updates: Partial<Node> = {
      lastHeard: new Date(lastHeardSec * 1000),
      updatedAt: new Date(),
    };

    if (snr !== undefined) {
      updates.snr = snr;
    }

    await this.db
      .update(nodes)
      .set(updates)
      .where(this.nodeCondition(ownerNodeNum, nodeNum));
  }

  async updateFavorite(
    ownerNodeNum: number,
    nodeNum: number,
    isFavorite: boolean,
  ): Promise<void> {
    await this.db
      .update(nodes)
      .set({ isFavorite, updatedAt: new Date() })
      .where(this.nodeCondition(ownerNodeNum, nodeNum));
  }

  async updatePrivateNote(
    ownerNodeNum: number,
    nodeNum: number,
    privateNote: string | null,
  ): Promise<void> {
    await this.db
      .update(nodes)
      .set({ privateNote, updatedAt: new Date() })
      .where(this.nodeCondition(ownerNodeNum, nodeNum));
  }

  async updateIgnored(
    ownerNodeNum: number,
    nodeNum: number,
    isIgnored: boolean,
  ): Promise<void> {
    await this.db
      .update(nodes)
      .set({ isIgnored, updatedAt: new Date() })
      .where(this.nodeCondition(ownerNodeNum, nodeNum));
  }

  async getFavorites(ownerNodeNum: number): Promise<Node[]> {
    return this.db
      .select()
      .from(nodes)
      .where(
        and(eq(nodes.ownerNodeNum, ownerNodeNum), eq(nodes.isFavorite, true)),
      )
      .orderBy(desc(nodes.lastHeard));
  }

  async getRecentNodes(
    ownerNodeNum: number,
    sinceTimestampMs: number,
  ): Promise<Node[]> {
    return this.db
      .select()
      .from(nodes)
      .where(
        and(
          eq(nodes.ownerNodeNum, ownerNodeNum),
          gt(nodes.lastHeard, new Date(sinceTimestampMs)),
        ),
      )
      .orderBy(desc(nodes.lastHeard));
  }

  async deleteNode(ownerNodeNum: number, nodeNum: number): Promise<void> {
    await this.db
      .delete(nodes)
      .where(this.nodeCondition(ownerNodeNum, nodeNum));
  }

  async countStaleNodes(
    ownerNodeNum: number,
    daysOld: number,
    unknownOnly = false,
  ): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(nodes)
      .where(this.staleNodesCondition(ownerNodeNum, daysOld, unknownOnly));

    return result[0]?.count ?? 0;
  }

  async getStaleNodes(
    ownerNodeNum: number,
    daysOld: number,
    unknownOnly = false,
  ): Promise<Node[]> {
    return this.db
      .select()
      .from(nodes)
      .where(this.staleNodesCondition(ownerNodeNum, daysOld, unknownOnly))
      .orderBy(nodes.lastHeard);
  }

  async deleteStaleNodes(
    ownerNodeNum: number,
    daysOld: number,
    unknownOnly = false,
  ): Promise<number> {
    return this.countAndDelete(
      () => this.countStaleNodes(ownerNodeNum, daysOld, unknownOnly),
      async () => {
        await this.db
          .delete(nodes)
          .where(this.staleNodesCondition(ownerNodeNum, daysOld, unknownOnly));
      },
    );
  }

  async logPosition(position: NewPositionLog): Promise<void> {
    await this.db.insert(positionLogs).values(position);
  }

  async getPositionHistory(
    ownerNodeNum: number,
    nodeNum: number,
    sinceMs?: number,
    limit = 100,
  ): Promise<PositionLog[]> {
    return this.db
      .select()
      .from(positionLogs)
      .where(this.positionLogsCondition(ownerNodeNum, nodeNum, sinceMs))
      .orderBy(positionLogs.time)
      .limit(limit);
  }

  async getPositionHistoryForNodes(
    ownerNodeNum: number,
    nodeNums: number[],
    sinceMs?: number,
    limitPerNode = 100,
  ): Promise<Map<number, PositionLog[]>> {
    if (nodeNums.length === 0) {
      return new Map();
    }

    const conditions = [
      eq(positionLogs.ownerNodeNum, ownerNodeNum),
      inArray(positionLogs.nodeNum, nodeNums),
    ];

    if (sinceMs !== undefined) {
      conditions.push(gt(positionLogs.time, new Date(sinceMs)));
    }

    const allPositions = await this.db
      .select()
      .from(positionLogs)
      .where(and(...conditions))
      .orderBy(positionLogs.nodeNum, positionLogs.time);

    const result = new Map<number, PositionLog[]>();

    for (const position of allPositions) {
      const existing = result.get(position.nodeNum) ?? [];
      if (existing.length < limitPerNode) {
        existing.push(position);
        result.set(position.nodeNum, existing);
      }
    }

    return result;
  }

  async deleteOldPositions(
    ownerNodeNum: number,
    olderThanMs: number,
  ): Promise<number> {
    const condition = and(
      eq(positionLogs.ownerNodeNum, ownerNodeNum),
      lt(positionLogs.time, new Date(olderThanMs)),
    );

    return this.countAndDelete(
      async () => {
        const result = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(positionLogs)
          .where(condition);
        return result[0]?.count ?? 0;
      },
      async () => {
        await this.db.delete(positionLogs).where(condition);
      },
    );
  }

  async logTelemetry(telemetry: NewTelemetryLog): Promise<void> {
    await this.db.insert(telemetryLogs).values(telemetry);
  }

  async getTelemetryHistory(
    ownerNodeNum: number,
    nodeNum: number,
    sinceMs?: number,
    limit = 100,
  ): Promise<TelemetryLog[]> {
    return this.db
      .select()
      .from(telemetryLogs)
      .where(this.telemetryLogsCondition(ownerNodeNum, nodeNum, sinceMs))
      .orderBy(telemetryLogs.time)
      .limit(limit);
  }

  async deleteOldTelemetry(
    ownerNodeNum: number,
    olderThanMs: number,
  ): Promise<number> {
    const condition = and(
      eq(telemetryLogs.ownerNodeNum, ownerNodeNum),
      lt(telemetryLogs.time, new Date(olderThanMs)),
    );

    return this.countAndDelete(
      async () => {
        const result = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(telemetryLogs)
          .where(condition);
        return result[0]?.count ?? 0;
      },
      async () => {
        await this.db.delete(telemetryLogs).where(condition);
      },
    );
  }
}
