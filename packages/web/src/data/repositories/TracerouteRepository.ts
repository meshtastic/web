import { and, desc, eq } from "drizzle-orm";
import { dbClient } from "../client.ts";
import {
  type NewTracerouteLog,
  type TracerouteLog,
  tracerouteLogs,
} from "../schema.ts";

/**
 * Repository for traceroute log operations
 */
export class TracerouteRepository {
  private get db() {
    return dbClient.db;
  }

  /**
   * Log a traceroute result
   */
  async logTraceroute(traceroute: NewTracerouteLog): Promise<void> {
    await this.db.insert(tracerouteLogs).values(traceroute);
  }

  /**
   * Get traceroute history for a specific target node
   */
  async getTraceroutesForNode(
    deviceId: number,
    targetNodeNum: number,
    limit = 10,
  ): Promise<TracerouteLog[]> {
    return this.db
      .select()
      .from(tracerouteLogs)
      .where(
        and(
          eq(tracerouteLogs.deviceId, deviceId),
          eq(tracerouteLogs.targetNodeNum, targetNodeNum),
        ),
      )
      .orderBy(desc(tracerouteLogs.createdAt))
      .limit(limit);
  }

  /**
   * Get the most recent traceroute for a target node
   */
  async getLatestTraceroute(
    deviceId: number,
    targetNodeNum: number,
  ): Promise<TracerouteLog | undefined> {
    const results = await this.db
      .select()
      .from(tracerouteLogs)
      .where(
        and(
          eq(tracerouteLogs.deviceId, deviceId),
          eq(tracerouteLogs.targetNodeNum, targetNodeNum),
        ),
      )
      .orderBy(desc(tracerouteLogs.createdAt))
      .limit(1);

    return results[0];
  }

  /**
   * Get all traceroutes for a device
   */
  async getAllTraceroutes(
    deviceId: number,
    limit = 100,
  ): Promise<TracerouteLog[]> {
    return this.db
      .select()
      .from(tracerouteLogs)
      .where(eq(tracerouteLogs.deviceId, deviceId))
      .orderBy(desc(tracerouteLogs.createdAt))
      .limit(limit);
  }

  /**
   * Delete traceroute logs for a specific target
   */
  async deleteTraceroutesForNode(
    deviceId: number,
    targetNodeNum: number,
  ): Promise<void> {
    await this.db
      .delete(tracerouteLogs)
      .where(
        and(
          eq(tracerouteLogs.deviceId, deviceId),
          eq(tracerouteLogs.targetNodeNum, targetNodeNum),
        ),
      );
  }

  /**
   * Delete all traceroute logs for a device
   */
  async deleteAllTraceroutes(deviceId: number): Promise<void> {
    await this.db
      .delete(tracerouteLogs)
      .where(eq(tracerouteLogs.deviceId, deviceId));
  }
}

export const tracerouteRepo = new TracerouteRepository();
