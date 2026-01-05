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

/** Nodes are considered "online" if heard within this many seconds */
const ONLINE_THRESHOLD_SECONDS = 900; // 15 minutes

/**
 * Repository for node operations
 */
export class NodeRepository {
  private get db() {
    return dbClient.db;
  }

  /**
   * Get the SQLocal client for reactive queries
   * @param client - Optional client override for dependency injection
   */
  getClient(client?: SQLocalDrizzle) {
    return client ?? dbClient.client;
  }

  // ===================
  // Private Helpers
  // ===================

  /**
   * Build the composite key condition for a specific node
   */
  private nodeCondition(ownerNodeNum: number, nodeNum: number) {
    return and(
      eq(nodes.ownerNodeNum, ownerNodeNum),
      eq(nodes.nodeNum, nodeNum),
    );
  }

  /**
   * Build condition for stale nodes (not heard from in X days)
   * @param unknownOnly - If true, only match nodes without a longName
   */
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

  /**
   * Build condition for position logs
   * @param sinceMs - Optional Unix timestamp in milliseconds
   */
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

  /**
   * Build condition for telemetry logs
   * @param sinceMs - Optional Unix timestamp in milliseconds
   */
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

  /**
   * Helper to count rows then delete them
   * Used because sqlocal doesn't return changes count
   */
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

  // ===================
  // Query Builders
  // ===================

  /**
   * Build a query to get all nodes for a device
   */
  buildNodesQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(nodes)
      .where(eq(nodes.ownerNodeNum, ownerNodeNum));
  }

  /**
   * Build a query to get online nodes
   * Online = heard within last 15 minutes
   */
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

  /**
   * Build a query to get position history for a node
   * @param sinceMs - Optional Unix timestamp in milliseconds
   */
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

  /**
   * Build a query to get telemetry history for a node
   * @param sinceMs - Optional Unix timestamp in milliseconds
   */
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

  // ===================
  // execute queries
  // ===================

  /**
   * Get the count of online nodes
   */
  async getOnlineNodeCount(deviceId: number): Promise<number> {
    const result = await this.buildOnlineNodesQuery(deviceId);
    return result.length;
  }

  /**
   * Get all nodes for a device
   */
  async getNodes(ownerNodeNum: number): Promise<Node[]> {
    return this.db
      .select()
      .from(nodes)
      .where(eq(nodes.ownerNodeNum, ownerNodeNum))
      .orderBy(desc(nodes.lastHeard));
  }

  /**
   * Get a specific node
   */
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

  /**
   * Upsert a node (insert or update)
   * Uses the composite PRIMARY KEY (ownerNodeNum, nodeNum) for automatic deduplication
   */
  async upsertNode(node: NewNode): Promise<void> {
    await this.db
      .insert(nodes)
      .values(node)
      .onConflictDoUpdate({
        target: [nodes.ownerNodeNum, nodes.nodeNum],
        set: {
          // Update all fields except the primary key
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

  /**
   * Update node position
   */
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

  /**
   * Update node user info
   */
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

  /**
   * Update node metrics
   */
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

  /**
   * Update last heard
   * @param lastHeardSec - Unix timestamp in seconds
   */
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

  /**
   * Update favorite status
   */
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

  /**
   * Add a private note about a node.
   */
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

  /**
   * Update ignored status
   */
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

  /**
   * Get favorite nodes
   */
  async getFavorites(ownerNodeNum: number): Promise<Node[]> {
    return this.db
      .select()
      .from(nodes)
      .where(
        and(eq(nodes.ownerNodeNum, ownerNodeNum), eq(nodes.isFavorite, true)),
      )
      .orderBy(desc(nodes.lastHeard));
  }

  /**
   * Get recently heard nodes
   * @param sinceTimestampMs - Unix timestamp in milliseconds
   */
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

  /**
   * Delete a node
   */
  async deleteNode(ownerNodeNum: number, nodeNum: number): Promise<void> {
    await this.db
      .delete(nodes)
      .where(this.nodeCondition(ownerNodeNum, nodeNum));
  }

  /**
   * Count stale nodes (not heard from in X days)
   * @param unknownOnly - If true, only count nodes without a longName
   */
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

  /**
   * Get stale nodes (not heard from in X days)
   * @param unknownOnly - If true, only return nodes without a longName
   */
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

  /**
   * Delete stale nodes (not heard from in X days)
   * @param unknownOnly - If true, only delete nodes without a longName
   */
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

  /**
   * Log a position update
   */
  async logPosition(position: NewPositionLog): Promise<void> {
    await this.db.insert(positionLogs).values(position);
  }

  /**
   * Get position history for a node
   * @param sinceMs - Optional Unix timestamp in milliseconds
   */
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

  /**
   * Get position history for multiple nodes at once
   * Returns a map of nodeNum -> position history
   * @param sinceMs - Optional Unix timestamp in milliseconds
   */
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

    // Group by nodeNum with per-node limit
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

  /**
   * Delete old position logs
   * @param olderThanMs - Unix timestamp in milliseconds
   */
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

  /**
   * Log telemetry data
   */
  async logTelemetry(telemetry: NewTelemetryLog): Promise<void> {
    await this.db.insert(telemetryLogs).values(telemetry);
  }

  /**
   * Get telemetry history for a node
   * @param sinceMs - Optional Unix timestamp in milliseconds
   */
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

  /**
   * Delete old telemetry logs
   * @param olderThanMs - Unix timestamp in milliseconds
   */
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
