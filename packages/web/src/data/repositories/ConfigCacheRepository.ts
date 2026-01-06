import { and, eq, sql } from "drizzle-orm";
import { dbClient } from "../client.ts";
import {
  // type ConfigChange,
  // configChanges,
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

export class ConfigCacheRepository {
  private get db() {
    return dbClient.db;
  }

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

  async deleteCachedConfig(ownerNodeNum: number): Promise<void> {
    await this.db
      .delete(deviceConfigs)
      .where(eq(deviceConfigs.ownerNodeNum, ownerNodeNum));
  }

  async getAllCachedConfigs(): Promise<DeviceConfig[]> {
    return this.db.select().from(deviceConfigs);
  }

  async getLocalChanges(ownerNodeNum: number): Promise<ConfigChange[]> {
    return this.db
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
      await this.db.delete(configChanges).where(whereCondition);
    } else {
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

  async resolveAllConflicts(
    ownerNodeNum: number,
    resolution: "local" | "remote",
  ): Promise<void> {
    if (resolution === "remote") {
      await this.db
        .delete(configChanges)
        .where(
          and(
            eq(configChanges.ownerNodeNum, ownerNodeNum),
            eq(configChanges.hasConflict, true),
          ),
        );
    } else {
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
