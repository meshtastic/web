import { and, count, desc, eq, lt, sql } from "drizzle-orm";
import { dbClient } from "../client";
import { packetLogs, type NewPacketLog, type PacketLog } from "../schema";

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
   * Log a packet
   */
  async logPacket(packet: NewPacketLog): Promise<void> {
    await this.db.insert(packetLogs).values(packet);
  }

  /**
   * Get recent packets for a device
   */
  async getPackets(
    deviceId: number,
    limit = 100,
    offset = 0,
  ): Promise<PacketLog[]> {
    return this.db
      .select()
      .from(packetLogs)
      .where(eq(packetLogs.deviceId, deviceId))
      .orderBy(desc(packetLogs.rxTime))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get packets from a specific node
   */
  async getPacketsFromNode(
    deviceId: number,
    nodeNum: number,
    limit = 100,
  ): Promise<PacketLog[]> {
    return this.db
      .select()
      .from(packetLogs)
      .where(
        and(
          eq(packetLogs.deviceId, deviceId),
          eq(packetLogs.fromNode, nodeNum),
        ),
      )
      .orderBy(desc(packetLogs.rxTime))
      .limit(limit);
  }

  /**
   * Get packet count for a device
   */
  async getPacketCount(deviceId: number): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(packetLogs)
      .where(eq(packetLogs.deviceId, deviceId));
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
    deviceId: number,
    maxPackets = DEFAULT_MAX_PACKETS,
  ): Promise<number> {
    // Get the ID of the Nth most recent packet
    const cutoffPacket = await this.db
      .select({ id: packetLogs.id })
      .from(packetLogs)
      .where(eq(packetLogs.deviceId, deviceId))
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
        and(eq(packetLogs.deviceId, deviceId), lt(packetLogs.id, cutoffId)),
      );

    return result.rowsAffected ?? 0;
  }

  /**
   * Delete all packets for a device
   */
  async deleteAllPackets(deviceId: number): Promise<void> {
    await this.db
      .delete(packetLogs)
      .where(eq(packetLogs.deviceId, deviceId));
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
      .selectDistinct({ deviceId: packetLogs.deviceId })
      .from(packetLogs);

    let deletedByCount = 0;
    for (const { deviceId } of devices) {
      deletedByCount += await this.trimPackets(deviceId, maxPackets);
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
    packetsPerDevice: Array<{ deviceId: number; count: number }>;
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
        deviceId: packetLogs.deviceId,
        count: count(),
      })
      .from(packetLogs)
      .groupBy(packetLogs.deviceId);

    return {
      totalPackets,
      oldestPacket: oldest[0]?.rxTime ?? null,
      newestPacket: newest[0]?.rxTime ?? null,
      packetsPerDevice: perDevice,
    };
  }
}
