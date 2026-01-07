import { and, eq, sql } from "drizzle-orm";
import { ALL_LEAF_KEYS } from "../../core/utils/merkleConfig.ts";
import { dbClient } from "../client.ts";
import { type NewWorkingHash, workingHashes } from "../schema.ts";

/**
 * Repository for managing working hash storage (pending config state).
 *
 * Working hashes represent the config state including pending local changes.
 * They are separate from base hashes to enable efficient change detection.
 */
export class WorkingHashRepository {
  private get db() {
    return dbClient.db;
  }

  /**
   * Build query to fetch all working hashes for a device.
   * Can be used with useDrizzleQuery for reactive updates.
   */
  buildHashesQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(workingHashes)
      .where(eq(workingHashes.ownerNodeNum, ownerNodeNum));
  }

  /**
   * Get all working hashes for a device.
   *
   * @param ownerNodeNum - Device node number
   * @returns Map of leaf key to hash, or empty map if no hashes stored
   */
  async getWorkingHashes(ownerNodeNum: number): Promise<Map<string, string>> {
    const rows = await this.db
      .select({
        leafKey: workingHashes.leafKey,
        hash: workingHashes.hash,
      })
      .from(workingHashes)
      .where(eq(workingHashes.ownerNodeNum, ownerNodeNum));

    const hashes = new Map<string, string>();
    for (const row of rows) {
      hashes.set(row.leafKey, row.hash);
    }

    return hashes;
  }

  /**
   * Save all working hashes for a device.
   * Uses upsert to update existing hashes or insert new ones.
   *
   * @param ownerNodeNum - Device node number
   * @param hashes - Map of leaf key to hash value
   */
  async saveWorkingHashes(
    ownerNodeNum: number,
    hashes: Map<string, string>,
  ): Promise<void> {
    if (hashes.size === 0) {
      return;
    }

    const now = new Date();
    const values: NewWorkingHash[] = [];

    for (const [leafKey, hash] of hashes) {
      values.push({
        ownerNodeNum,
        leafKey,
        hash,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Batch upsert all hashes
    for (const value of values) {
      await this.db
        .insert(workingHashes)
        .values(value)
        .onConflictDoUpdate({
          target: [workingHashes.ownerNodeNum, workingHashes.leafKey],
          set: {
            hash: value.hash,
            updatedAt: sql`(unixepoch() * 1000)`,
          },
        });
    }
  }

  /**
   * Update a single working hash.
   *
   * @param ownerNodeNum - Device node number
   * @param leafKey - The leaf key to update
   * @param hash - New hash value
   */
  async updateHash(
    ownerNodeNum: number,
    leafKey: string,
    hash: string,
  ): Promise<void> {
    await this.db
      .insert(workingHashes)
      .values({
        ownerNodeNum,
        leafKey,
        hash,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [workingHashes.ownerNodeNum, workingHashes.leafKey],
        set: {
          hash,
          updatedAt: sql`(unixepoch() * 1000)`,
        },
      });
  }

  /**
   * Delete all working hashes for a device.
   *
   * @param ownerNodeNum - Device node number
   */
  async deleteHashes(ownerNodeNum: number): Promise<void> {
    await this.db
      .delete(workingHashes)
      .where(eq(workingHashes.ownerNodeNum, ownerNodeNum));
  }

  /**
   * Delete a specific working hash.
   *
   * @param ownerNodeNum - Device node number
   * @param leafKey - The leaf key to delete
   */
  async deleteHash(ownerNodeNum: number, leafKey: string): Promise<void> {
    await this.db
      .delete(workingHashes)
      .where(
        and(
          eq(workingHashes.ownerNodeNum, ownerNodeNum),
          eq(workingHashes.leafKey, leafKey),
        ),
      );
  }

  /**
   * Check if working hashes exist for a device.
   *
   * @param ownerNodeNum - Device node number
   * @returns True if any working hashes are stored for this device
   */
  async hasHashes(ownerNodeNum: number): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(workingHashes)
      .where(eq(workingHashes.ownerNodeNum, ownerNodeNum));

    return (result[0]?.count ?? 0) > 0;
  }

  /**
   * Copy base hashes to working hashes.
   * Used when initializing working state from base config.
   *
   * @param ownerNodeNum - Device node number
   * @param baseHashes - Map of leaf key to base hash value
   */
  async initializeFromBase(
    ownerNodeNum: number,
    baseHashes: Map<string, string>,
  ): Promise<void> {
    // Delete any existing working hashes
    await this.deleteHashes(ownerNodeNum);
    // Save base hashes as working hashes
    await this.saveWorkingHashes(ownerNodeNum, baseHashes);
  }

  /**
   * Check if all expected hashes are present for a device.
   *
   * @param ownerNodeNum - Device node number
   * @returns True if all expected leaf hashes are present
   */
  async hasCompleteHashes(ownerNodeNum: number): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(workingHashes)
      .where(eq(workingHashes.ownerNodeNum, ownerNodeNum));

    return (result[0]?.count ?? 0) === ALL_LEAF_KEYS.length;
  }
}
