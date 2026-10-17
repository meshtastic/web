import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { SQLocalDrizzle } from "sqlocal/drizzle";
import * as schema from "./schema/index.ts";
import { MIGRATIONS } from "./schema/migrations.ts";

export interface CreateSqlocalDbOptions {
  /** OPFS path. Defaults to "meshtastic.db". */
  databasePath?: string;
}

export type SqlocalDb = BaseSQLiteDatabase<"async", unknown, typeof schema>;

export interface OpenedSqlocalDb {
  db: SqlocalDb;
  /**
   * Where the database actually lives. sqlocal falls back to "memory" without
   * throwing when OPFS can't be used (no cross-origin isolation, a private
   * window), and nothing written then survives a reload.
   */
  storageType: string;
  /** True when the database is saved to OPFS. */
  persistent: boolean;
}

/**
 * Opens (or creates) the OPFS-backed SQLite database, applies migrations, and
 * returns a Drizzle client typed against the schema, along with where sqlocal
 * ended up storing it. One instance per origin — sqlocal serializes writes
 * via Web Locks under the hood.
 */
export async function openSqlocalDb(
  options: CreateSqlocalDbOptions = {},
): Promise<OpenedSqlocalDb> {
  const databasePath = options.databasePath ?? "meshtastic.db";
  const client = new SQLocalDrizzle({ databasePath });
  const { driver, batchDriver, sql } = client;
  const db = drizzle(driver, batchDriver, {
    schema,
    casing: "snake_case",
  }) as SqlocalDb;

  await applyMigrations(sql);

  const { storageType = "memory" } = await client.getDatabaseInfo();
  return { db, storageType, persistent: storageType === "opfs" };
}

/** {@link openSqlocalDb} for callers that only need the Drizzle client. */
export async function createSqlocalDb(
  options: CreateSqlocalDbOptions = {},
): Promise<SqlocalDb> {
  return (await openSqlocalDb(options)).db;
}

type RawSql = (
  query: TemplateStringsArray,
  ...values: ReadonlyArray<unknown>
) => Promise<unknown>;

export const isDuplicateColumn = (e: unknown): boolean =>
  /duplicate column name/i.test(e instanceof Error ? e.message : String(e));

async function applyMigrations(sql: RawSql): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS _schema (version INTEGER PRIMARY KEY)`;
  const rows =
    (await sql`SELECT version FROM _schema ORDER BY version DESC LIMIT 1`) as Array<{
      version: number;
    }>;
  const current = rows[0]?.version ?? 0;
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    for (const statement of migration.sql) {
      try {
        await sql([statement] as unknown as TemplateStringsArray);
      } catch (e) {
        // Another tab opening the same database can apply an ALTER TABLE
        // first; the column it adds is the one we wanted.
        if (!isDuplicateColumn(e)) throw e;
      }
    }
    await sql`INSERT OR IGNORE INTO _schema (version) VALUES (${migration.version})`;
  }
}
