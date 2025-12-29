import { and, eq, sql } from "drizzle-orm";
import { dbClient } from "../client.ts";
import {
  type ConfigChange,
  configChanges,
  type DeviceConfig,
  deviceConfigs,
} from "../schema.ts";

export interface CachedConfig {
  config: Record<string, unknown>;
  moduleConfig: Record<string, unknown>;
  configHash: string | null;
  configVersion: number | null;
  lastSyncedAt: Date;
  firmwareVersion: string | null;
}

export type ChangeType = "config" | "moduleConfig" | "channel" | "user";

export interface ConflictInfo {
  changeType: ChangeType;
  variant: string | null;
  channelIndex: number | null;
  fieldPath: string | null;
  localValue: unknown;
  remoteValue: unknown;
  originalValue: unknown;
}

/**
 * Repository for device config caching and change tracking
 */
export class ConfigCacheRepository {
  private get db() {
    return dbClient.db;
  }


  /**
   * Get cached config for a device
   */
  async getCachedConfig(
    ownerNodeNum: number,
  ): Promise<CachedConfig | undefined> {
    const result = await this.db
      .select()
      .from(deviceConfigs)
      .where(eq(deviceConfigs.ownerNodeNum, ownerNodeNum))
      .limit(1);

    const row = result[0];
    if (!row) return undefined;

    return {
      config: row.config as Record<string, unknown>,
      moduleConfig: row.moduleConfig as Record<string, unknown>,
      configHash: row.configHash,
      configVersion: row.configVersion,
      lastSyncedAt: new Date(row.lastSyncedAt),
      firmwareVersion: row.firmwareVersion,
    };
  }

  /**
   * Save or update cached config
   */
  async saveCachedConfig(
    ownerNodeNum: number,
    config: Record<string, unknown>,
    moduleConfig: Record<string, unknown>,
    options?: {
      configHash?: string;
      configVersion?: number;
      firmwareVersion?: string;
    },
  ): Promise<void> {
    const now = new Date();

    await this.db
      .insert(deviceConfigs)
      .values({
        ownerNodeNum,
        config,
        moduleConfig,
        configHash: options?.configHash ?? null,
        configVersion: options?.configVersion ?? null,
        firmwareVersion: options?.firmwareVersion ?? null,
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [deviceConfigs.ownerNodeNum],
        set: {
          config,
          moduleConfig,
          configHash: options?.configHash ?? null,
          configVersion: options?.configVersion ?? null,
          firmwareVersion: options?.firmwareVersion ?? null,
          lastSyncedAt: now,
          updatedAt: now,
        },
      });
  }

  /**
   * Update just the config hash (after computing it)
   */
  async updateConfigHash(
    ownerNodeNum: number,
    configHash: string,
  ): Promise<void> {
    await this.db
      .update(deviceConfigs)
      .set({
        configHash,
        updatedAt: new Date(),
      })
      .where(eq(deviceConfigs.ownerNodeNum, ownerNodeNum));
  }

  /**
   * Delete cached config for a device
   */
  async deleteCachedConfig(ownerNodeNum: number): Promise<void> {
    await this.db
      .delete(deviceConfigs)
      .where(eq(deviceConfigs.ownerNodeNum, ownerNodeNum));
  }

  /**
   * Get all cached configs (for debugging/admin)
   */
  async getAllCachedConfigs(): Promise<DeviceConfig[]> {
    return this.db.select().from(deviceConfigs);
  }


  /**
   * Get all pending local changes for a device
   */
  async getLocalChanges(ownerNodeNum: number): Promise<ConfigChange[]> {
    return this.db
      .select()
      .from(configChanges)
      .where(eq(configChanges.ownerNodeNum, ownerNodeNum));
  }

  /**
   * Get local changes for a specific config type/variant
   */
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

  /**
   * Save a local change
   */
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

    await this.db
      .insert(configChanges)
      .values({
        ownerNodeNum,
        changeType: change.changeType,
        variant: change.variant ?? null,
        channelIndex: change.channelIndex ?? null,
        fieldPath: change.fieldPath ?? null,
        value: change.value,
        originalValue: change.originalValue ?? null,
        hasConflict: false,
        remoteValue: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          configChanges.ownerNodeNum,
          configChanges.changeType,
          configChanges.variant,
          configChanges.channelIndex,
          configChanges.fieldPath,
        ],
        set: {
          value: change.value,
          updatedAt: now,
        },
      });
  }

  /**
   * Check if a specific config has local changes
   */
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

  /**
   * Clear a specific local change
   */
  async clearLocalChange(
    ownerNodeNum: number,
    changeType: ChangeType,
    variant: string | null,
    channelIndex: number | null,
    fieldPath: string | null,
  ): Promise<void> {
    await this.db.delete(configChanges).where(
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

  /**
   * Clear all local changes for a device (after successful save)
   */
  async clearAllLocalChanges(ownerNodeNum: number): Promise<void> {
    await this.db
      .delete(configChanges)
      .where(eq(configChanges.ownerNodeNum, ownerNodeNum));
  }

  /**
   * Clear local changes for a specific variant (after saving that config)
   */
  async clearLocalChangesForVariant(
    ownerNodeNum: number,
    changeType: ChangeType,
    variant: string | null,
  ): Promise<void> {
    await this.db.delete(configChanges).where(
      and(
        eq(configChanges.ownerNodeNum, ownerNodeNum),
        eq(configChanges.changeType, changeType),
        variant !== null
          ? eq(configChanges.variant, variant)
          : sql`${configChanges.variant} IS NULL`,
      ),
    );
  }


  /**
   * Get all conflicts for a device
   */
  async getConflicts(ownerNodeNum: number): Promise<ConflictInfo[]> {
    const results = await this.db
      .select()
      .from(configChanges)
      .where(
        and(
          eq(configChanges.ownerNodeNum, ownerNodeNum),
          eq(configChanges.hasConflict, true),
        ),
      );

    return results.map((r) => ({
      changeType: r.changeType,
      variant: r.variant,
      channelIndex: r.channelIndex,
      fieldPath: r.fieldPath,
      localValue: r.value,
      remoteValue: r.remoteValue,
      originalValue: r.originalValue,
    }));
  }

  /**
   * Check if device has any conflicts
   */
  async hasConflicts(ownerNodeNum: number): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(configChanges)
      .where(
        and(
          eq(configChanges.ownerNodeNum, ownerNodeNum),
          eq(configChanges.hasConflict, true),
        ),
      );

    return (result[0]?.count ?? 0) > 0;
  }

  /**
   * Mark a change as having a conflict
   */
  async markConflict(
    ownerNodeNum: number,
    changeType: ChangeType,
    variant: string | null,
    channelIndex: number | null,
    fieldPath: string | null,
    remoteValue: unknown,
  ): Promise<void> {
    await this.db
      .update(configChanges)
      .set({
        hasConflict: true,
        remoteValue,
        updatedAt: new Date(),
      })
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

  /**
   * Resolve a conflict by accepting local or remote value
   */
  async resolveConflict(
    ownerNodeNum: number,
    changeType: ChangeType,
    variant: string | null,
    channelIndex: number | null,
    fieldPath: string | null,
    resolution: "local" | "remote",
  ): Promise<void> {
    const whereCondition = and(
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
    );

    if (resolution === "remote") {
      // Accept remote: delete the local change entirely
      await this.db.delete(configChanges).where(whereCondition);
    } else {
      // Accept local: clear conflict flag, keep the local change
      await this.db
        .update(configChanges)
        .set({
          hasConflict: false,
          remoteValue: null,
          updatedAt: new Date(),
        })
        .where(whereCondition);
    }
  }

  /**
   * Resolve all conflicts for a device
   */
  async resolveAllConflicts(
    ownerNodeNum: number,
    resolution: "local" | "remote",
  ): Promise<void> {
    if (resolution === "remote") {
      // Accept remote: delete all conflicting changes
      await this.db
        .delete(configChanges)
        .where(
          and(
            eq(configChanges.ownerNodeNum, ownerNodeNum),
            eq(configChanges.hasConflict, true),
          ),
        );
    } else {
      // Accept local: clear conflict flags
      await this.db
        .update(configChanges)
        .set({
          hasConflict: false,
          remoteValue: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(configChanges.ownerNodeNum, ownerNodeNum),
            eq(configChanges.hasConflict, true),
          ),
        );
    }
  }
}
