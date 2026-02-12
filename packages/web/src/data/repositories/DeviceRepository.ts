import { desc, eq, sql } from "drizzle-orm";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { dbClient } from "../client.ts";
import { type Device, type NewDevice, devices } from "../schema.ts";

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
          updatedAt: new Date(),
        },
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

  /**
   * Compute approximate storage bytes per device across all device-scoped tables.
   * Uses SUM(LENGTH(QUOTE(column))) as a proxy for row data size.
   */
  async getStoragePerDevice(): Promise<Map<number, number>> {
    const rawSql = dbClient.sql;

    // Tables with owner_node_num FK
    const ownerTables = [
      "messages",
      "message_reactions",
      "nodes",
      "channels",
      "position_logs",
      "packet_logs",
      "telemetry_logs",
      "message_drafts",
      "last_read",
      "traceroute_logs",
      "device_configs",
      "config_changes",
      "config_hashes",
      "working_hashes",
    ];

    // Build a UNION ALL query: for each table, sum row sizes grouped by owner
    const parts: string[] = [];

    for (const table of ownerTables) {
      parts.push(
        `SELECT owner_node_num AS node_num, SUM(LENGTH(QUOTE(owner_node_num))) AS bytes FROM ${table} GROUP BY owner_node_num`,
      );
    }

    // devices table uses node_num as PK
    parts.push(
      `SELECT node_num, SUM(LENGTH(QUOTE(node_num))) AS bytes FROM devices GROUP BY node_num`,
    );

    // connections table uses node_num FK (nullable)
    parts.push(
      `SELECT node_num, SUM(LENGTH(QUOTE(node_num))) AS bytes FROM connections WHERE node_num IS NOT NULL GROUP BY node_num`,
    );

    // Wrap: we want total row size, not just one column.
    // Replace the simple LENGTH(QUOTE(owner_node_num)) with a full-row proxy.
    // SQLite trick: use the * expansion via a subquery isn't possible,
    // but we can use: SELECT ... SUM(LENGTH(QUOTE(col1)) + LENGTH(QUOTE(col2)) + ...) ...
    // That's too verbose for 16 tables. Instead, use a row-count approach:
    // count rows and multiply by avg row size, then add LENGTH for large text columns.
    //
    // Simpler: just count total bytes using the page-level approach isn't per-device.
    // Let's use the pragmatic approach: count rows per table per device.
    // For a more accurate result, we specifically sum the large variable-length columns.

    const query = `
      SELECT node_num, SUM(bytes) AS total_bytes FROM (
        SELECT owner_node_num AS node_num, COUNT(*) * 200 + COALESCE(SUM(LENGTH(message)), 0) AS bytes FROM messages GROUP BY owner_node_num
        UNION ALL
        SELECT owner_node_num, COUNT(*) * 80 FROM message_reactions GROUP BY owner_node_num
        UNION ALL
        SELECT owner_node_num, COUNT(*) * 300 FROM nodes GROUP BY owner_node_num
        UNION ALL
        SELECT owner_node_num, COUNT(*) * 100 FROM channels GROUP BY owner_node_num
        UNION ALL
        SELECT owner_node_num, COUNT(*) * 100 FROM position_logs GROUP BY owner_node_num
        UNION ALL
        SELECT owner_node_num, COUNT(*) * 120 + COALESCE(SUM(LENGTH(raw_packet)), 0) FROM packet_logs GROUP BY owner_node_num
        UNION ALL
        SELECT owner_node_num, COUNT(*) * 120 FROM telemetry_logs GROUP BY owner_node_num
        UNION ALL
        SELECT owner_node_num, COUNT(*) * 60 + COALESCE(SUM(LENGTH(content)), 0) FROM message_drafts GROUP BY owner_node_num
        UNION ALL
        SELECT owner_node_num, COUNT(*) * 60 FROM last_read GROUP BY owner_node_num
        UNION ALL
        SELECT owner_node_num, COUNT(*) * 80 + COALESCE(SUM(LENGTH(route) + LENGTH(COALESCE(route_back,'')) + LENGTH(COALESCE(snr_towards,'')) + LENGTH(COALESCE(snr_back,''))), 0) FROM traceroute_logs GROUP BY owner_node_num
        UNION ALL
        SELECT owner_node_num, COUNT(*) * 100 + COALESCE(SUM(LENGTH(config) + LENGTH(module_config)), 0) FROM device_configs GROUP BY owner_node_num
        UNION ALL
        SELECT owner_node_num, COUNT(*) * 80 + COALESCE(SUM(LENGTH(COALESCE(value,'')) + LENGTH(COALESCE(original_value,'')) + LENGTH(COALESCE(remote_value,''))), 0) FROM config_changes GROUP BY owner_node_num
        UNION ALL
        SELECT owner_node_num, COUNT(*) * 60 FROM config_hashes GROUP BY owner_node_num
        UNION ALL
        SELECT owner_node_num, COUNT(*) * 60 FROM working_hashes GROUP BY owner_node_num
        UNION ALL
        SELECT node_num, COUNT(*) * 80 FROM devices GROUP BY node_num
        UNION ALL
        SELECT node_num, COUNT(*) * 120 FROM connections WHERE node_num IS NOT NULL GROUP BY node_num
      ) GROUP BY node_num
    `;

    const rows = await rawSql<{ node_num: number; total_bytes: number }>(query);
    const map = new Map<number, number>();
    for (const row of rows) {
      map.set(row.node_num, row.total_bytes);
    }
    return map;
  }
}
