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

/**
 * Opens (or creates) the OPFS-backed SQLite database, applies migrations, and
 * returns a Drizzle client typed against the schema. One instance per origin —
 * sqlocal serializes writes via Web Locks under the hood.
 */
export async function createSqlocalDb(options: CreateSqlocalDbOptions = {}): Promise<SqlocalDb> {
  const databasePath = options.databasePath ?? "meshtastic.db";
  const { driver, batchDriver, sql } = new SQLocalDrizzle({ databasePath });
  const db = drizzle(driver, batchDriver, { schema, casing: "snake_case" }) as SqlocalDb;

  await applyMigrations(sql);

  return db;
}

type RawSql = (query: TemplateStringsArray, ...values: ReadonlyArray<unknown>) => Promise<unknown>;

async function applyMigrations(sql: RawSql): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS _schema (version INTEGER PRIMARY KEY)`;
  const rows = (await sql`SELECT version FROM _schema ORDER BY version DESC LIMIT 1`) as Array<{
    version: number;
  }>;
  const current = rows[0]?.version ?? 0;
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    for (const statement of migration.sql) {
      await sql([statement] as unknown as TemplateStringsArray);
    }
    await sql`INSERT INTO _schema (version) VALUES (${migration.version})`;
  }
}
