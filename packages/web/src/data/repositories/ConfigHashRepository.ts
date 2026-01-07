import { and, eq, sql } from "drizzle-orm";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { ALL_LEAF_KEYS } from "../../core/utils/merkleConfig.ts";
import { dbClient } from "../client.ts";
import { configHashes, type NewConfigHash } from "../schema.ts";

/**
 * Repository for managing config hash storage (Merkle tree leaves).
 *
 * Provides persistence for base config hashes, enabling:
 * - Change detection across page refreshes
 * - Conflict detection on reconnect
 * - Efficient diff computation
 */
export class ConfigHashRepository {
  private get db() {
    return dbClient.db;
  }

  getClient(client?: SQLocalDrizzle) {
    return client ?? dbClient.client;
  }

  /**
   * Build query to fetch all hashes for a device.
   * Can be used with useDrizzleQuery for reactive updates.
   */
  buildHashesQuery(ownerNodeNum: number) {
    return this.db
      .select()
      .from(configHashes)
      .where(eq(configHashes.ownerNodeNum, ownerNodeNum));
  }

  /**
   * Get all base hashes for a device.
   *
   * @param ownerNodeNum - Device node number
   * @returns Map of leaf key to hash, or empty map if no hashes stored
   */
  async getBaseHashes(ownerNodeNum: number): Promise<Map<string, string>> {
    const rows = await this.db
      .select({
        leafKey: configHashes.leafKey,
        hash: configHashes.hash,
      })
      .from(configHashes)
      .where(eq(configHashes.ownerNodeNum, ownerNodeNum));

    const hashes = new Map<string, string>();
    for (const row of rows) {
      hashes.set(row.leafKey, row.hash);
    }

    return hashes;
  }

  /**
   * Save all base hashes for a device.
   * Uses upsert to update existing hashes or insert new ones.
   *
   * @param ownerNodeNum - Device node number
   * @param hashes - Map of leaf key to hash value
   */
  async saveBaseHashes(
    ownerNodeNum: number,
    hashes: Map<string, string>,
  ): Promise<void> {
    if (hashes.size === 0) {
      return;
    }

    const now = new Date();
    const values: NewConfigHash[] = [];

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
        .insert(configHashes)
        .values(value)
        .onConflictDoUpdate({
          target: [configHashes.ownerNodeNum, configHashes.leafKey],
          set: {
            hash: value.hash,
            updatedAt: sql`(unixepoch() * 1000)`,
          },
        });
    }
  }

  /**
   * Update a single hash.
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
      .insert(configHashes)
      .values({
        ownerNodeNum,
        leafKey,
        hash,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [configHashes.ownerNodeNum, configHashes.leafKey],
        set: {
          hash,
          updatedAt: sql`(unixepoch() * 1000)`,
        },
      });
  }

  /**
   * Delete all hashes for a device.
   *
   * @param ownerNodeNum - Device node number
   */
  async deleteHashes(ownerNodeNum: number): Promise<void> {
    await this.db
      .delete(configHashes)
      .where(eq(configHashes.ownerNodeNum, ownerNodeNum));
  }

  /**
   * Delete a specific hash.
   *
   * @param ownerNodeNum - Device node number
   * @param leafKey - The leaf key to delete
   */
  async deleteHash(ownerNodeNum: number, leafKey: string): Promise<void> {
    await this.db
      .delete(configHashes)
      .where(
        and(
          eq(configHashes.ownerNodeNum, ownerNodeNum),
          eq(configHashes.leafKey, leafKey),
        ),
      );
  }

  /**
   * Check if hashes exist for a device.
   *
   * @param ownerNodeNum - Device node number
   * @returns True if any hashes are stored for this device
   */
  async hasHashes(ownerNodeNum: number): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(configHashes)
      .where(eq(configHashes.ownerNodeNum, ownerNodeNum));

    return (result[0]?.count ?? 0) > 0;
  }

  /**
   * Get the count of stored hashes for a device.
   *
   * @param ownerNodeNum - Device node number
   * @returns Number of hashes stored
   */
  async getHashCount(ownerNodeNum: number): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(configHashes)
      .where(eq(configHashes.ownerNodeNum, ownerNodeNum));

    return result[0]?.count ?? 0;
  }

  /**
   * Check if all expected hashes are present for a device.
   * Useful for detecting incomplete hash state.
   *
   * @param ownerNodeNum - Device node number
   * @returns True if all 30 expected leaf hashes are present
   */
  async hasCompleteHashes(ownerNodeNum: number): Promise<boolean> {
    const count = await this.getHashCount(ownerNodeNum);
    return count === ALL_LEAF_KEYS.length;
  }
}
