import { and, eq, sql } from "drizzle-orm";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { dbClient } from "../client.ts";
import { type ConfigChange, configChanges } from "../schema.ts";

export type ChangeType = "config" | "moduleConfig" | "channel" | "user";

export class PendingChangesRepository {
  private get db() {
    return dbClient.db;
  }

  getClient(client?: SQLocalDrizzle) {
    return client ?? dbClient.client;
  }

  /**
   * Build a query to fetch all pending config changes for a device.
   * Can be used with useReactiveSQL for reactive updates.
   */
  buildChangesQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(configChanges)
      .where(eq(configChanges.ownerNodeNum, ownerNodeNum));
  }

  /**
   * Get all pending changes for a device (async version of buildChangesQuery)
   */
  async getPendingChanges(ownerNodeNum: number): Promise<ConfigChange[]> {
    return await this.db
      .select()
      .from(configChanges)
      .where(eq(configChanges.ownerNodeNum, ownerNodeNum));
  }

  async getLocalChangesForVariant(
    ownerNodeNum: number,
    changeType: ChangeType,
    variant: string | null,
  ): Promise<ConfigChange[]> {
    const conditions = [
      eq(configChanges.ownerNodeNum, ownerNodeNum),
      eq(configChanges.changeType, changeType),
    ];

    if (variant !== null) {
      conditions.push(eq(configChanges.variant, variant));
    }

    return this.db
      .select()
      .from(configChanges)
      .where(and(...conditions));
  }

  async saveLocalChange(
    ownerNodeNum: number,
    change: {
      changeType: "config" | "moduleConfig" | "channel" | "user";
      variant?: string;
      channelIndex?: number;
      fieldPath?: string;
      value: unknown;
      originalValue?: unknown;
    },
  ): Promise<void> {
    const now = new Date();
    const variant = change.variant ?? null;
    const channelIndex = change.channelIndex ?? null;
    const fieldPath = change.fieldPath ?? null;

    // SQLite treats NULLs as distinct in unique constraints, so we need to
    // explicitly check for existing rows and update them instead of relying
    // on onConflictDoUpdate
    const existing = await this.db
      .select({ id: configChanges.id })
      .from(configChanges)
      .where(
        and(
          eq(configChanges.ownerNodeNum, ownerNodeNum),
          eq(configChanges.changeType, change.changeType),
          variant !== null
            ? eq(configChanges.variant, variant)
            : sql`${configChanges.variant} IS NULL`,
          channelIndex !== null
            ? eq(configChanges.channelIndex, channelIndex)
            : sql`${configChanges.channelIndex} IS NULL`,
          fieldPath !== null
            ? eq(configChanges.fieldPath, fieldPath)
            : sql`${configChanges.fieldPath} IS NULL`,
        ),
      )
      .limit(1);

    const existingRow = existing[0];
    if (existingRow) {
      // Update existing row
      await this.db
        .update(configChanges)
        .set({
          value: change.value,
          updatedAt: now,
        })
        .where(eq(configChanges.id, existingRow.id));
    } else {
      // Insert new row
      await this.db.insert(configChanges).values({
        ownerNodeNum,
        changeType: change.changeType,
        variant,
        channelIndex,
        fieldPath,
        value: change.value,
        originalValue: change.originalValue ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  async hasLocalChanges(
    ownerNodeNum: number,
    changeType: ChangeType,
    variant: string | null,
  ): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(configChanges)
      .where(
        and(
          eq(configChanges.ownerNodeNum, ownerNodeNum),
          eq(configChanges.changeType, changeType),
          variant !== null
            ? eq(configChanges.variant, variant)
            : sql`${configChanges.variant} IS NULL`,
        ),
      );

    return (result[0]?.count ?? 0) > 0;
  }

  async clearLocalChange(
    ownerNodeNum: number,
    changeType: ChangeType,
    variant: string | null,
    channelIndex: number | null,
    fieldPath: string | null,
  ): Promise<void> {
    await this.db
      .delete(configChanges)
      .where(
        and(
          eq(configChanges.ownerNodeNum, ownerNodeNum),
          eq(configChanges.changeType, changeType),
          variant !== null
            ? eq(configChanges.variant, variant)
            : sql`${configChanges.variant} IS NULL`,
          channelIndex !== null
            ? eq(configChanges.channelIndex, channelIndex)
            : sql`${configChanges.channelIndex} IS NULL`,
          fieldPath !== null
            ? eq(configChanges.fieldPath, fieldPath)
            : sql`${configChanges.fieldPath} IS NULL`,
        ),
      );
  }

  async clearAllLocalChanges(ownerNodeNum: number): Promise<void> {
    await this.db
      .delete(configChanges)
      .where(eq(configChanges.ownerNodeNum, ownerNodeNum));
  }

  async clearLocalChangesForVariant(
    ownerNodeNum: number,
    changeType: ChangeType,
    variant: string | null,
  ): Promise<void> {
    await this.db
      .delete(configChanges)
      .where(
        and(
          eq(configChanges.ownerNodeNum, ownerNodeNum),
          eq(configChanges.changeType, changeType),
          variant !== null
            ? eq(configChanges.variant, variant)
            : sql`${configChanges.variant} IS NULL`,
        ),
      );
  }
}

// Export singleton instance
export const pendingChangesRepo = new PendingChangesRepository();
