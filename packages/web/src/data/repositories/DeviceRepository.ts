import { desc, eq, sql } from "drizzle-orm";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { dbClient } from "../client.ts";
import { type Device, devices, type NewDevice } from "../schema.ts";

/**
 * Repository for device operations
 * The devices table is the anchor for all device-scoped data with cascade deletes
 */
export class DeviceRepository {
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
   * Build a query to get all devices
   */
  buildDevicesQuery() {
    return this.db.select().from(devices).orderBy(desc(devices.lastSeen));
  }

  /**
   * Build a query to get a specific device
   */
  buildDeviceQuery(nodeNum: number) {
    return this.db
      .select()
      .from(devices)
      .where(eq(devices.nodeNum, nodeNum))
      .limit(1);
  }

  // ===================
  // Execute Queries
  // ===================

  /**
   * Get all devices
   */
  async getAllDevices(): Promise<Device[]> {
    return this.db.select().from(devices).orderBy(desc(devices.lastSeen));
  }

  /**
   * Get a specific device
   */
  async getDevice(nodeNum: number): Promise<Device | undefined> {
    const result = await this.db
      .select()
      .from(devices)
      .where(eq(devices.nodeNum, nodeNum))
      .limit(1);

    return result[0];
  }

  /**
   * Check if a device exists
   */
  async deviceExists(nodeNum: number): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(devices)
      .where(eq(devices.nodeNum, nodeNum));

    return (result[0]?.count ?? 0) > 0;
  }

  /**
   * Upsert a device (insert or update)
   * Updates lastSeen on every call
   */
  async upsertDevice(device: NewDevice): Promise<void> {
    await this.db
      .insert(devices)
      .values({
        ...device,
        lastSeen: new Date(),
      })
      .onConflictDoUpdate({
        target: devices.nodeNum,
        set: {
          shortName: device.shortName,
          longName: device.longName,
          hwModel: device.hwModel,
          lastSeen: sql`(unixepoch() * 1000)`,
        },
      });
  }

  /**
   * Update device info
   */
  async updateDevice(
    nodeNum: number,
    data: Partial<Omit<Device, "nodeNum" | "firstSeen">>,
  ): Promise<void> {
    await this.db
      .update(devices)
      .set({
        ...data,
        lastSeen: new Date(),
      })
      .where(eq(devices.nodeNum, nodeNum));
  }

  /**
   * Update last seen timestamp
   */
  async updateLastSeen(nodeNum: number): Promise<void> {
    await this.db
      .update(devices)
      .set({ lastSeen: new Date() })
      .where(eq(devices.nodeNum, nodeNum));
  }

  /**
   * Delete a device and all associated data (cascade delete)
   */
  async deleteDevice(nodeNum: number): Promise<void> {
    await this.db.delete(devices).where(eq(devices.nodeNum, nodeNum));
  }

  /**
   * Get the most recently seen device
   */
  async getLastActiveDevice(): Promise<Device | undefined> {
    const result = await this.db
      .select()
      .from(devices)
      .orderBy(desc(devices.lastSeen))
      .limit(1);

    return result[0];
  }
}
