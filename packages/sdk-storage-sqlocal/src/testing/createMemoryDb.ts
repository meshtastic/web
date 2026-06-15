import { drizzle } from "drizzle-orm/sql-js";
import initSqlJs from "sql.js";
import * as schema from "../schema/index.ts";
import { MIGRATIONS } from "../schema/migrations.ts";
import type { SqlocalDb } from "../db.ts";

/**
 * In-memory database backed by sql.js, for tests and other Node contexts.
 * Same Drizzle interface as the production sqlocal connection so repository
 * code is portable between browser and test runs.
 */
export async function createMemoryDb(): Promise<SqlocalDb> {
  const SQL = await initSqlJs({});
  const sqlite = new SQL.Database();

  for (const migration of MIGRATIONS) {
    for (const statement of migration.sql) {
      sqlite.run(statement);
    }
    sqlite.run("INSERT OR IGNORE INTO _schema (version) VALUES (?)", [migration.version]);
  }

  return drizzle(sqlite, { schema, casing: "snake_case" }) as unknown as SqlocalDb;
}
