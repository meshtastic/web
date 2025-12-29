import { eq } from "drizzle-orm";
import logger from "../core/services/logger.ts";
import { dbClient } from "./client.ts";
import {
  channels,
  lastRead,
  messageDrafts,
  messages,
  nodes,
} from "./schema.ts";

/**
 * Service for database operations related to device data management
 */
export class MigrationService {
  /**
   * Delete all data for a specific device from SQL
   */
  static async deleteDeviceData(deviceId: number): Promise<void> {
    logger.debug(`[MigrationService] Deleting data for device ${deviceId}...`);

    await dbClient.init();
    const db = dbClient.db;

    await db.delete(messages).where(eq(messages.ownerNodeNum, deviceId));
    await db.delete(nodes).where(eq(nodes.ownerNodeNum, deviceId));
    await db.delete(channels).where(eq(channels.ownerNodeNum, deviceId));
    await db.delete(messageDrafts).where(eq(messageDrafts.ownerNodeNum, deviceId));
    await db.delete(lastRead).where(eq(lastRead.ownerNodeNum, deviceId));

    logger.debug(`[MigrationService] Deleted all data for device ${deviceId}`);
  }

  /**
   * Check if device data exists in SQL
   */
  static async hasDeviceData(deviceId: number): Promise<boolean> {
    await dbClient.init();
    const db = dbClient.db;

    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.ownerNodeNum, deviceId))
      .limit(1);

    return result.length > 0;
  }
}
