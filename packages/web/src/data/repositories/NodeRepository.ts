import { and, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
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

/**
 * Repository for node operations
 */
export class NodeRepository {
  private get db() {
    return dbClient.db;
  }

  /**
   * Get all nodes for a device
   */
  async getNodes(deviceId: number): Promise<Node[]> {
    return this.db
      .select()
      .from(nodes)
      .where(eq(nodes.deviceId, deviceId))
      .orderBy(desc(nodes.lastHeard));
  }

  /**
   * Get a specific node
   */
  async getNode(deviceId: number, nodeNum: number): Promise<Node | undefined> {
    const result = await this.db
      .select()
      .from(nodes)
      .where(and(eq(nodes.deviceId, deviceId), eq(nodes.nodeNum, nodeNum)))
      .limit(1);

    return result[0];
  }

  /**
   * Upsert a node (insert or update)
   * Uses the composite PRIMARY KEY (deviceId, nodeNum) for automatic deduplication
   */
  async upsertNode(node: NewNode): Promise<void> {
    await this.db
      .insert(nodes)
      .values(node)
      .onConflictDoUpdate({
        target: [nodes.deviceId, nodes.nodeNum],
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
          updatedAt: sql`(unixepoch() * 1000)`, // Use SQL function for current timestamp
        },
      });
  }

  /**
   * Update node position
   */
  async updatePosition(
    deviceId: number,
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
      .where(and(eq(nodes.deviceId, deviceId), eq(nodes.nodeNum, nodeNum)));
  }

  /**
   * Update node user info
   */
  async updateUser(
    deviceId: number,
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
      .where(and(eq(nodes.deviceId, deviceId), eq(nodes.nodeNum, nodeNum)));
  }

  /**
   * Update node metrics
   */
  async updateMetrics(
    deviceId: number,
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
      .where(and(eq(nodes.deviceId, deviceId), eq(nodes.nodeNum, nodeNum)));
  }

  /**
   * Update last heard
   * @param lastHeard - Unix timestamp in seconds
   */
  async updateLastHeard(
    deviceId: number,
    nodeNum: number,
    lastHeard: number,
    snr?: number,
  ): Promise<void> {
    const updates: Partial<Node> = {
      lastHeard: new Date(lastHeard * 1000), // Convert seconds to Date
      updatedAt: new Date(),
    };

    if (snr !== undefined) {
      updates.snr = snr;
    }

    await this.db
      .update(nodes)
      .set(updates)
      .where(and(eq(nodes.deviceId, deviceId), eq(nodes.nodeNum, nodeNum)));
  }

  /**
   * Update favorite status
   */
  async updateFavorite(
    deviceId: number,
    nodeNum: number,
    isFavorite: boolean,
  ): Promise<void> {
    await this.db
      .update(nodes)
      .set({ isFavorite, updatedAt: new Date() })
      .where(and(eq(nodes.deviceId, deviceId), eq(nodes.nodeNum, nodeNum)));
  }

  /**
   *  Add a private note about a node.
   */

  async updatePrivateNote(
    deviceId: number,
    nodeNum: number,
    privateNote: string | null,
  ): Promise<void> {
    await this.db
      .update(nodes)
      .set({ privateNote, updatedAt: new Date() })
      .where(and(eq(nodes.deviceId, deviceId), eq(nodes.nodeNum, nodeNum)));
  }

  /**
   * Update ignored status
   */
  async updateIgnored(
    deviceId: number,
    nodeNum: number,
    isIgnored: boolean,
  ): Promise<void> {
    await this.db
      .update(nodes)
      .set({ isIgnored, updatedAt: new Date() })
      .where(and(eq(nodes.deviceId, deviceId), eq(nodes.nodeNum, nodeNum)));
  }

  /**
   * Get favorite nodes
   */
  async getFavorites(deviceId: number): Promise<Node[]> {
    return this.db
      .select()
      .from(nodes)
      .where(and(eq(nodes.deviceId, deviceId), eq(nodes.isFavorite, true)))
      .orderBy(desc(nodes.lastHeard));
  }

  /**
   * Get recently heard nodes
   */
  async getRecentNodes(
    deviceId: number,
    sinceTimestamp: number,
  ): Promise<Node[]> {
    return this.db
      .select()
      .from(nodes)
      .where(
        and(
          eq(nodes.deviceId, deviceId),
          gt(nodes.lastHeard, new Date(sinceTimestamp)),
        ),
      )
      .orderBy(desc(nodes.lastHeard));
  }

  /**
   * Delete a node
   */
  async deleteNode(deviceId: number, nodeNum: number): Promise<void> {
    await this.db
      .delete(nodes)
      .where(and(eq(nodes.deviceId, deviceId), eq(nodes.nodeNum, nodeNum)));
  }

  /**
   * Count stale nodes (not heard from in X days)
   * @param unknownOnly - If true, only count nodes without a longName
   */
  async countStaleNodes(
    deviceId: number,
    daysOld: number,
    unknownOnly = false,
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    let baseCondition = and(
      eq(nodes.deviceId, deviceId),
      lt(nodes.lastHeard, cutoffDate),
    );

    if (unknownOnly) {
      baseCondition = and(
        baseCondition,
        or(isNull(nodes.longName), eq(nodes.longName, "")),
      );
    }

    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(nodes)
      .where(baseCondition);

    return result[0]?.count ?? 0;
  }

  /**
   * Get stale nodes (not heard from in X days)
   * @param unknownOnly - If true, only return nodes without a longName
   */
  async getStaleNodes(
    deviceId: number,
    daysOld: number,
    unknownOnly = false,
  ): Promise<Node[]> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    let baseCondition = and(
      eq(nodes.deviceId, deviceId),
      lt(nodes.lastHeard, cutoffDate),
    );

    if (unknownOnly) {
      baseCondition = and(
        baseCondition,
        or(isNull(nodes.longName), eq(nodes.longName, "")),
      );
    }

    return this.db
      .select()
      .from(nodes)
      .where(baseCondition)
      .orderBy(nodes.lastHeard);
  }

  /**
   * Delete stale nodes (not heard from in X days)
   * @param unknownOnly - If true, only delete nodes without a longName
   */
  async deleteStaleNodes(
    deviceId: number,
    daysOld: number,
    unknownOnly = false,
  ): Promise<number> {
    // First count the nodes to be deleted (since sqlocal doesn't return changes count)
    const count = await this.countStaleNodes(deviceId, daysOld, unknownOnly);

    if (count === 0) {
      return 0;
    }

    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    let baseCondition = and(
      eq(nodes.deviceId, deviceId),
      lt(nodes.lastHeard, cutoffDate),
    );

    if (unknownOnly) {
      baseCondition = and(
        baseCondition,
        or(isNull(nodes.longName), eq(nodes.longName, "")),
      );
    }

    await this.db.delete(nodes).where(baseCondition);

    return count;
  }

  // ==================== Position History ====================

  /**
   * Log a position update
   */
  async logPosition(position: NewPositionLog): Promise<void> {
    await this.db.insert(positionLogs).values(position);
  }

  /**
   * Get position history for a node
   */
  async getPositionHistory(
    deviceId: number,
    nodeNum: number,
    since?: number,
    limit = 100,
  ): Promise<PositionLog[]> {
    const conditions = [
      eq(positionLogs.deviceId, deviceId),
      eq(positionLogs.nodeNum, nodeNum),
    ];

    if (since !== undefined) {
      conditions.push(gt(positionLogs.time, new Date(since)));
    }

    return this.db
      .select()
      .from(positionLogs)
      .where(and(...conditions))
      .orderBy(positionLogs.time)
      .limit(limit);
  }

  /**
   * Get position history for multiple nodes at once
   * Returns a map of nodeNum -> position history
   */
  async getPositionHistoryForNodes(
    deviceId: number,
    nodeNums: number[],
    since?: number,
    limitPerNode = 100,
  ): Promise<Map<number, PositionLog[]>> {
    if (nodeNums.length === 0) {
      return new Map();
    }

    const conditions = [eq(positionLogs.deviceId, deviceId)];

    if (since !== undefined) {
      conditions.push(gt(positionLogs.time, new Date(since)));
    }

    // Fetch all positions for all nodes
    const allPositions = await this.db
      .select()
      .from(positionLogs)
      .where(and(...conditions))
      .orderBy(positionLogs.nodeNum, positionLogs.time);

    // Group by nodeNum and apply per-node limit
    const result = new Map<number, PositionLog[]>();

    for (const position of allPositions) {
      if (!nodeNums.includes(position.nodeNum)) {
        continue;
      }

      const existing = result.get(position.nodeNum) || [];
      if (existing.length < limitPerNode) {
        existing.push(position);
        result.set(position.nodeNum, existing);
      }
    }

    return result;
  }

  /**
   * Delete old position logs
   */
  async deleteOldPositions(
    deviceId: number,
    olderThan: number,
  ): Promise<number> {
    // Count first since sqlocal doesn't return changes count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(positionLogs)
      .where(
        and(
          eq(positionLogs.deviceId, deviceId),
          lt(positionLogs.time, new Date(olderThan)),
        ),
      );

    const count = countResult[0]?.count ?? 0;
    if (count === 0) {
      return 0;
    }

    await this.db
      .delete(positionLogs)
      .where(
        and(
          eq(positionLogs.deviceId, deviceId),
          lt(positionLogs.time, new Date(olderThan)),
        ),
      );

    return count;
  }

  // ==================== Telemetry History ====================

  /**
   * Log telemetry data
   */
  async logTelemetry(telemetry: NewTelemetryLog): Promise<void> {
    await this.db.insert(telemetryLogs).values(telemetry);
  }

  /**
   * Get telemetry history for a node
   */
  async getTelemetryHistory(
    deviceId: number,
    nodeNum: number,
    since?: number,
    limit = 100,
  ): Promise<TelemetryLog[]> {
    const conditions = [
      eq(telemetryLogs.deviceId, deviceId),
      eq(telemetryLogs.nodeNum, nodeNum),
    ];

    if (since !== undefined) {
      conditions.push(gt(telemetryLogs.time, new Date(since)));
    }

    return this.db
      .select()
      .from(telemetryLogs)
      .where(and(...conditions))
      .orderBy(telemetryLogs.time)
      .limit(limit);
  }

  /**
   * Delete old telemetry logs
   */
  async deleteOldTelemetry(
    deviceId: number,
    olderThan: number,
  ): Promise<number> {
    // Count first since sqlocal doesn't return changes count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(telemetryLogs)
      .where(
        and(
          eq(telemetryLogs.deviceId, deviceId),
          lt(telemetryLogs.time, new Date(olderThan)),
        ),
      );

    const count = countResult[0]?.count ?? 0;
    if (count === 0) {
      return 0;
    }

    await this.db
      .delete(telemetryLogs)
      .where(
        and(
          eq(telemetryLogs.deviceId, deviceId),
          lt(telemetryLogs.time, new Date(olderThan)),
        ),
      );

    return count;
  }
}
