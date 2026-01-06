import { desc, eq, isNotNull } from "drizzle-orm";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { dbClient } from "../client.ts";
import { type Connection, connections, type NewConnection } from "../schema.ts";

export type ConnectionType = "http" | "bluetooth" | "serial";
export type ConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "disconnecting"
  | "configuring"
  | "configured"
  | "online"
  | "error";

export class ConnectionRepository {
  private get db() {
    return dbClient.db;
  }

  getClient(client?: SQLocalDrizzle) {
    return client ?? dbClient.client;
  }

  buildConnectionsQuery() {
    return this.db.select().from(connections);
  }

  buildConnectionQuery(id: number) {
    return this.db
      .select()
      .from(connections)
      .where(eq(connections.id, id));
  }

  buildDefaultConnectionQuery() {
    return this.db
      .select()
      .from(connections)
      .where(eq(connections.isDefault, true));
  }

  async getConnections(): Promise<Connection[]> {
    return this.db
      .select()
      .from(connections)
      .orderBy(desc(connections.lastConnectedAt));
  }

  async getConnection(id: number): Promise<Connection | undefined> {
    const result = await this.db
      .select()
      .from(connections)
      .where(eq(connections.id, id))
      .limit(1);

    return result[0];
  }

  async getDefaultConnection(): Promise<Connection | undefined> {
    const result = await this.db
      .select()
      .from(connections)
      .where(eq(connections.isDefault, true))
      .limit(1);

    return result[0];
  }

  async getLastActiveDeviceId(): Promise<number | null> {
    const result = await this.db
      .select({ meshDeviceId: connections.meshDeviceId })
      .from(connections)
      .where(isNotNull(connections.meshDeviceId))
      .orderBy(desc(connections.lastConnectedAt))
      .limit(1);

    return result[0]?.meshDeviceId ?? null;
  }

  async getLastConnectedConnection(): Promise<Connection | undefined> {
    const result = await this.db
      .select()
      .from(connections)
      .where(isNotNull(connections.lastConnectedAt))
      .orderBy(desc(connections.lastConnectedAt))
      .limit(1);

    return result[0];
  }

  async createConnection(
    connection: Omit<NewConnection, "id" | "createdAt" | "updatedAt">,
  ): Promise<Connection> {
    const result = await this.db
      .insert(connections)
      .values({
        ...connection,
        status: connection.status ?? "disconnected",
      })
      .returning();

    return result[0];
  }

  async updateConnection(
    id: number,
    updates: Partial<Omit<Connection, "id" | "createdAt">>,
  ): Promise<void> {
    await this.db
      .update(connections)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(connections.id, id));
  }

  async updateStatus(
    id: number,
    status: ConnectionStatus,
    error?: string,
  ): Promise<void> {
    const updates: Partial<Connection> = {
      status,
      error: error ?? null,
      updatedAt: new Date(),
    };

    if (status === "connected" || status === "configured") {
      updates.lastConnectedAt = new Date();
    }

    await this.db
      .update(connections)
      .set(updates)
      .where(eq(connections.id, id));
  }

  async linkMeshDevice(id: number, meshDeviceId: number): Promise<void> {
    await this.db
      .update(connections)
      .set({
        meshDeviceId,
        updatedAt: new Date(),
      })
      .where(eq(connections.id, id));
  }

  async setDefault(id: number, isDefault: boolean): Promise<void> {
    if (isDefault) {
      await this.db
        .update(connections)
        .set({ isDefault: false, updatedAt: new Date() });
    }

    await this.db
      .update(connections)
      .set({ isDefault, updatedAt: new Date() })
      .where(eq(connections.id, id));
  }

  async deleteConnection(id: number): Promise<void> {
    await this.db.delete(connections).where(eq(connections.id, id));
  }

  async resetAllStatuses(): Promise<void> {
    await this.db.update(connections).set({
      status: "disconnected",
      error: null,
      updatedAt: new Date(),
    });
  }
}
