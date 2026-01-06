import { and, count, desc, eq, isNotNull, lt } from "drizzle-orm";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { dbClient } from "../client.ts";
import { type NewPacketLog, type PacketLog, packetLogs } from "../schema.ts";

const DEFAULT_MAX_PACKETS = 10000;
const DEFAULT_MAX_AGE_DAYS = 7;

export class PacketLogRepository {
  private get db() {
    return dbClient.db;
  }

  getClient(client?: SQLocalDrizzle) {
    return client ?? dbClient.client;
  }

  buildPacketLogsQuery(ownerNodeNum: number, limit = 100) {
    return this.db
      .select()
      .from(packetLogs)
      .where(eq(packetLogs.ownerNodeNum, ownerNodeNum))
      .orderBy(desc(packetLogs.rxTime))
      .limit(limit);
  }

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

  async logPacket(packet: NewPacketLog): Promise<void> {
    await this.db.insert(packetLogs).values(packet);
  }

  async logPacketsBatch(packets: NewPacketLog[]): Promise<void> {
    if (packets.length === 0) return;

    await this.db.transaction(async (tx) => {
      await tx.insert(packetLogs).values(packets);
    });
  }

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

  async getPacketCount(ownerNodeNum: number): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(packetLogs)
      .where(eq(packetLogs.ownerNodeNum, ownerNodeNum));
    return result[0]?.count ?? 0;
  }

  async getTotalPacketCount(): Promise<number> {
    const result = await this.db.select({ count: count() }).from(packetLogs);
    return result[0]?.count ?? 0;
  }

  async deleteOldPackets(maxAgeDays = DEFAULT_MAX_AGE_DAYS): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

    const result = await this.db
      .delete(packetLogs)
      .where(lt(packetLogs.rxTime, cutoffDate));

    return result.rowsAffected ?? 0;
  }

  async trimPackets(
    ownerNodeNum: number,
    maxPackets = DEFAULT_MAX_PACKETS,
  ): Promise<number> {
    const cutoffPacket = await this.db
      .select({ id: packetLogs.id })
      .from(packetLogs)
      .where(eq(packetLogs.ownerNodeNum, ownerNodeNum))
      .orderBy(desc(packetLogs.rxTime))
      .limit(1)
      .offset(maxPackets - 1);

    if (cutoffPacket.length === 0) {
      return 0;
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

  async deleteAllPackets(ownerNodeNum: number): Promise<void> {
    await this.db.delete(packetLogs).where(eq(packetLogs.ownerNodeNum, ownerNodeNum));
  }

  async clearAllPackets(): Promise<void> {
    await this.db.delete(packetLogs);
  }

  async performMaintenance(options?: {
    maxAgeDays?: number;
    maxPacketsPerDevice?: number;
  }): Promise<{ deletedByAge: number; deletedByCount: number }> {
    const maxAgeDays = options?.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;
    const maxPackets = options?.maxPacketsPerDevice ?? DEFAULT_MAX_PACKETS;

    const deletedByAge = await this.deleteOldPackets(maxAgeDays);

    const devices = await this.db
      .selectDistinct({ ownerNodeNum: packetLogs.ownerNodeNum })
      .from(packetLogs);

    let deletedByCount = 0;
    for (const { ownerNodeNum } of devices) {
      deletedByCount += await this.trimPackets(ownerNodeNum, maxPackets);
    }

    return { deletedByAge, deletedByCount };
  }

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
