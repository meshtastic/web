import { and, desc, eq } from "drizzle-orm";
import { dbClient } from "../client.ts";
import {
  type NewTracerouteLog,
  type TracerouteLog,
  tracerouteLogs,
} from "../schema.ts";

export class TracerouteRepository {
  private get db() {
    return dbClient.db;
  }

  async logTraceroute(traceroute: NewTracerouteLog): Promise<void> {
    await this.db.insert(tracerouteLogs).values(traceroute);
  }

  async getTraceroutesForNode(
    ownerNodeNum: number,
    targetNodeNum: number,
    limit = 10,
  ): Promise<TracerouteLog[]> {
    return this.db
      .select()
      .from(tracerouteLogs)
      .where(
        and(
          eq(tracerouteLogs.ownerNodeNum, ownerNodeNum),
          eq(tracerouteLogs.targetNodeNum, targetNodeNum),
        ),
      )
      .orderBy(desc(tracerouteLogs.createdAt))
      .limit(limit);
  }

  async getLatestTraceroute(
    ownerNodeNum: number,
    targetNodeNum: number,
  ): Promise<TracerouteLog | undefined> {
    const results = await this.db
      .select()
      .from(tracerouteLogs)
      .where(
        and(
          eq(tracerouteLogs.ownerNodeNum, ownerNodeNum),
          eq(tracerouteLogs.targetNodeNum, targetNodeNum),
        ),
      )
      .orderBy(desc(tracerouteLogs.createdAt))
      .limit(1);

    return results[0];
  }

  async getAllTraceroutes(
    ownerNodeNum: number,
    limit = 100,
  ): Promise<TracerouteLog[]> {
    return this.db
      .select()
      .from(tracerouteLogs)
      .where(eq(tracerouteLogs.ownerNodeNum, ownerNodeNum))
      .orderBy(desc(tracerouteLogs.createdAt))
      .limit(limit);
  }

  async deleteTraceroutesForNode(
    ownerNodeNum: number,
    targetNodeNum: number,
  ): Promise<void> {
    await this.db
      .delete(tracerouteLogs)
      .where(
        and(
          eq(tracerouteLogs.ownerNodeNum, ownerNodeNum),
          eq(tracerouteLogs.targetNodeNum, targetNodeNum),
        ),
      );
  }

  async deleteAllTraceroutes(ownerNodeNum: number): Promise<void> {
    await this.db
      .delete(tracerouteLogs)
      .where(eq(tracerouteLogs.ownerNodeNum, ownerNodeNum));
  }
}

export const tracerouteRepo = new TracerouteRepository();
