import { desc, eq, sql } from "drizzle-orm";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { dbClient } from "../client.ts";
import { channels, type Device, devices, type NewDevice } from "../schema.ts";

export class DeviceRepository {
  private get db() {
    return dbClient.db;
  }

  getClient(client?: SQLocalDrizzle) {
    return client ?? dbClient.client;
  }

  buildDevicesQuery() {
    return this.db.select().from(devices).orderBy(desc(devices.lastSeen));
  }

  buildDeviceQuery(nodeNum: number) {
    return this.db
      .select()
      .from(devices)
      .where(eq(devices.nodeNum, nodeNum))
      .limit(1);
  }

  async getAllDevices(): Promise<Device[]> {
    return this.db.select().from(devices).orderBy(desc(devices.lastSeen));
  }

  async getDevice(nodeNum: number): Promise<Device | undefined> {
    const result = await this.db
      .select()
      .from(devices)
      .where(eq(devices.nodeNum, nodeNum))
      .limit(1);

    return result[0];
  }

  async deviceExists(nodeNum: number): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(devices)
      .where(eq(devices.nodeNum, nodeNum));

    return (result[0]?.count ?? 0) > 0;
  }

  async upsertDevice(device: NewDevice): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
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
            updatedAt: new Date(),
          },
        });
    });
  }

  async updateDevice(
    nodeNum: number,
    data: Partial<Omit<Device, "nodeNum" | "firstSeen">>,
  ): Promise<void> {
    await this.db
      .update(devices)
      .set({
        ...data,
        lastSeen: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(devices.nodeNum, nodeNum));
  }

  async updateLastSeen(nodeNum: number): Promise<void> {
    await this.db
      .update(devices)
      .set({
        lastSeen: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(devices.nodeNum, nodeNum));
  }

  async deleteDevice(nodeNum: number): Promise<void> {
    await this.db.delete(devices).where(eq(devices.nodeNum, nodeNum));
  }

  async getLastActiveDevice(): Promise<Device | undefined> {
    const result = await this.db
      .select()
      .from(devices)
      .orderBy(desc(devices.lastSeen))
      .limit(1);

    return result[0];
  }
}
