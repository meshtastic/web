import { and, count, desc, eq, isNotNull, lt } from "drizzle-orm";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { dbClient } from "../client.ts";
import { type NewPacketLog, type PacketLog, packetLogs } from "../schema.ts";

// Default limits to prevent unbounded growth
const DEFAULT_MAX_PACKETS = 10000;
const DEFAULT_MAX_AGE_DAYS = 7;

/**
 * Repository for packet log operations
 * Includes automatic cleanup to prevent database bloat
 */
export class PacketLogRepository {
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
  // Query Builders 
  // ===================

  /**
   * Build a query to get packet logs for a device
   */
  buildPacketLogsQuery(ownerNodeNum: number, limit = 100) {
    return this.db
      .select()
      .from(packetLogs)
      .where(eq(packetLogs.ownerNodeNum, ownerNodeNum))
      .orderBy(desc(packetLogs.rxTime))
      .limit(limit);
  }

  /**
   * Build a query to get signal logs (SNR/RSSI) for a specific node
   */
  buildSignalLogsQuery(ownerNodeNum: number, nodeNum: number, limit = 100) {
    return this.db
      .select({
        id: packetLogs.id,
        rxTime: packetLogs.rxTime,
        rxSnr: packetLogs.rxSnr,
        rxRssi: packetLogs.rxRssi,
      })
      .from(packetLogs)
      .where(
        and(
          eq(packetLogs.ownerNodeNum, ownerNodeNum),
          eq(packetLogs.fromNode, nodeNum),
          isNotNull(packetLogs.rxSnr),
          isNotNull(packetLogs.rxRssi),
        ),
      )
      .orderBy(desc(packetLogs.rxTime))
      .limit(limit);
  }

  // ===================
  // Async Methods (execute queries)
  // ===================

  /**
   * Log a packet
   */
  async logPacket(packet: NewPacketLog): Promise<void> {
    await this.db.insert(packetLogs).values(packet);
  }

  /**
   * Log multiple packets in a single transaction
   * Much more efficient than individual inserts
   */
  async logPacketsBatch(packets: NewPacketLog[]): Promise<void> {
    if (packets.length === 0) return;

    await this.db.transaction(async (tx) => {
      await tx.insert(packetLogs).values(packets);
    });
  }

  /**
   * Get recent packets for a device
   */
  async getPackets(
    ownerNodeNum: number,
    limit = 100,
    offset = 0,
  ): Promise<PacketLog[]> {
    return this.db
      .select()
      .from(packetLogs)
      .where(eq(packetLogs.ownerNodeNum, ownerNodeNum))
      .orderBy(desc(packetLogs.rxTime))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get packets from a specific node
   */
  async getPacketsFromNode(
    ownerNodeNum: number,
    nodeNum: number,
    limit = 100,
  ): Promise<PacketLog[]> {
    return this.db
      .select()
      .from(packetLogs)
      .where(
        and(
          eq(packetLogs.ownerNodeNum, ownerNodeNum),
          eq(packetLogs.fromNode, nodeNum),
        ),
      )
      .orderBy(desc(packetLogs.rxTime))
      .limit(limit);
  }

  /**
   * Get packet count for a device
   */
  async getPacketCount(ownerNodeNum: number): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(packetLogs)
      .where(eq(packetLogs.ownerNodeNum, ownerNodeNum));
    return result[0]?.count ?? 0;
  }

  /**
   * Get total packet count across all devices
   */
  async getTotalPacketCount(): Promise<number> {
    const result = await this.db.select({ count: count() }).from(packetLogs);
    return result[0]?.count ?? 0;
  }

  /**
   * Delete old packets beyond the retention period
   */
  async deleteOldPackets(maxAgeDays = DEFAULT_MAX_AGE_DAYS): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

    const result = await this.db
      .delete(packetLogs)
      .where(lt(packetLogs.rxTime, cutoffDate));

    return result.rowsAffected ?? 0;
  }

  /**
   * Trim packets to keep only the most recent N packets per device
   */
  async trimPackets(
    ownerNodeNum: number,
    maxPackets = DEFAULT_MAX_PACKETS,
  ): Promise<number> {
    // Get the ID of the Nth most recent packet
    const cutoffPacket = await this.db
      .select({ id: packetLogs.id })
      .from(packetLogs)
      .where(eq(packetLogs.ownerNodeNum, ownerNodeNum))
      .orderBy(desc(packetLogs.rxTime))
      .limit(1)
      .offset(maxPackets - 1);

    if (cutoffPacket.length === 0) {
      return 0; // Not enough packets to trim
    }

    const cutoffId = cutoffPacket[0]?.id;
    if (cutoffId === undefined) {
      return 0;
    }

    const result = await this.db
      .delete(packetLogs)
      .where(
        and(eq(packetLogs.ownerNodeNum, ownerNodeNum), lt(packetLogs.id, cutoffId)),
      );

    return result.rowsAffected ?? 0;
  }

  /**
   * Delete all packets for a device
   */
  async deleteAllPackets(ownerNodeNum: number): Promise<void> {
    await this.db.delete(packetLogs).where(eq(packetLogs.ownerNodeNum, ownerNodeNum));
  }

  /**
   * Delete all packets across all devices
   */
  async clearAllPackets(): Promise<void> {
    await this.db.delete(packetLogs);
  }

  /**
   * Perform maintenance cleanup
   * Call this periodically to keep the database size in check
   */
  async performMaintenance(options?: {
    maxAgeDays?: number;
    maxPacketsPerDevice?: number;
  }): Promise<{ deletedByAge: number; deletedByCount: number }> {
    const maxAgeDays = options?.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;
    const maxPackets = options?.maxPacketsPerDevice ?? DEFAULT_MAX_PACKETS;

    // First, delete old packets
    const deletedByAge = await this.deleteOldPackets(maxAgeDays);

    // Then, trim each device to max packets
    const devices = await this.db
      .selectDistinct({ ownerNodeNum: packetLogs.ownerNodeNum })
      .from(packetLogs);

    let deletedByCount = 0;
    for (const { ownerNodeNum } of devices) {
      deletedByCount += await this.trimPackets(ownerNodeNum, maxPackets);
    }

    return { deletedByAge, deletedByCount };
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalPackets: number;
    oldestPacket: Date | null;
    newestPacket: Date | null;
    packetsPerDevice: Array<{ ownerNodeNum: number; count: number }>;
  }> {
    const totalPackets = await this.getTotalPacketCount();

    const oldest = await this.db
      .select({ rxTime: packetLogs.rxTime })
      .from(packetLogs)
      .orderBy(packetLogs.rxTime)
      .limit(1);

    const newest = await this.db
      .select({ rxTime: packetLogs.rxTime })
      .from(packetLogs)
      .orderBy(desc(packetLogs.rxTime))
      .limit(1);

    const perDevice = await this.db
      .select({
        ownerNodeNum: packetLogs.ownerNodeNum,
        count: count(),
      })
      .from(packetLogs)
      .groupBy(packetLogs.ownerNodeNum);

    return {
      totalPackets,
      oldestPacket: oldest[0]?.rxTime ?? null,
      newestPacket: newest[0]?.rxTime ?? null,
      packetsPerDevice: perDevice,
    };
  }
}
