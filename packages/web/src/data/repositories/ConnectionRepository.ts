import { desc, eq } from "drizzle-orm";
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

/**
 * Repository for connection operations
 */
export class ConnectionRepository {
  private get db() {
    return dbClient.db;
  }

  /**
   * Get all connections
   */
  async getConnections(): Promise<Connection[]> {
    return this.db
      .select()
      .from(connections)
      .orderBy(desc(connections.lastConnectedAt));
  }

  /**
   * Get a connection by ID
   */
  async getConnection(id: number): Promise<Connection | undefined> {
    const result = await this.db
      .select()
      .from(connections)
      .where(eq(connections.id, id))
      .limit(1);

    return result[0];
  }

  /**
   * Get the default connection
   */
  async getDefaultConnection(): Promise<Connection | undefined> {
    const result = await this.db
      .select()
      .from(connections)
      .where(eq(connections.isDefault, true))
      .limit(1);

    return result[0];
  }

  /**
   * Create a new connection
   */
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

  /**
   * Update a connection
   */
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

  /**
   * Update connection status
   */
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

    // Update lastConnectedAt when successfully connecting
    if (status === "connected" || status === "configured") {
      updates.lastConnectedAt = new Date();
    }

    await this.db
      .update(connections)
      .set(updates)
      .where(eq(connections.id, id));
  }

  /**
   * Link a mesh device to a connection
   */
  async linkMeshDevice(id: number, meshDeviceId: number): Promise<void> {
    await this.db
      .update(connections)
      .set({
        meshDeviceId,
        updatedAt: new Date(),
      })
      .where(eq(connections.id, id));
  }

  /**
   * Set a connection as default (and unset others)
   */
  async setDefault(id: number, isDefault: boolean): Promise<void> {
    if (isDefault) {
      // First, unset all defaults
      await this.db
        .update(connections)
        .set({ isDefault: false, updatedAt: new Date() });
    }

    // Set this one
    await this.db
      .update(connections)
      .set({ isDefault, updatedAt: new Date() })
      .where(eq(connections.id, id));
  }

  /**
   * Delete a connection
   */
  async deleteConnection(id: number): Promise<void> {
    await this.db.delete(connections).where(eq(connections.id, id));
  }

  /**
   * Reset all connection statuses to disconnected
   * (Called on app startup)
   */
  async resetAllStatuses(): Promise<void> {
    await this.db.update(connections).set({
      status: "disconnected",
      error: null,
      updatedAt: new Date(),
    });
  }
}
