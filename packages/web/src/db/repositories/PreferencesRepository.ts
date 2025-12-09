import { eq } from "drizzle-orm";
import { dbClient } from "../client";
import { preferences } from "../schema";

/**
 * Repository for user preferences (key-value store)
 */
export class PreferencesRepository {
  private get db() {
    return dbClient.db;
  }

  /**
   * Get a preference value by key
   */
  async get<T>(key: string): Promise<T | undefined> {
    const result = await this.db
      .select()
      .from(preferences)
      .where(eq(preferences.key, key))
      .limit(1);

    if (!result[0]) {
      return undefined;
    }

    try {
      return JSON.parse(result[0].value) as T;
    } catch {
      return undefined;
    }
  }

  /**
   * Set a preference value
   */
  async set<T>(key: string, value: T): Promise<void> {
    const jsonValue = JSON.stringify(value);

    await this.db
      .insert(preferences)
      .values({
        key,
        value: jsonValue,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: preferences.key,
        set: {
          value: jsonValue,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Delete a preference
   */
  async delete(key: string): Promise<void> {
    await this.db.delete(preferences).where(eq(preferences.key, key));
  }

  /**
   * Get all preferences
   */
  async getAll(): Promise<Map<string, unknown>> {
    const result = await this.db.select().from(preferences);
    const map = new Map<string, unknown>();

    for (const row of result) {
      try {
        map.set(row.key, JSON.parse(row.value));
      } catch {
        // Skip invalid JSON
      }
    }

    return map;
  }
}
