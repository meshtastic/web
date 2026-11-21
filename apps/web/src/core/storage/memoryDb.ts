import { drizzle } from "drizzle-orm/sql-js";
import initSqlJs from "sql.js";
import type { SqlocalDb } from "./db.ts";
import * as schema from "./schema.ts";
import { schemaStatements } from "./schema.ts";

/**
 * In-memory database backed by sql.js, for tests and other Node contexts.
 * Same Drizzle interface as the production sqlocal connection so repository
 * code is portable between browser and test runs.
 */
export async function createMemoryDb(): Promise<SqlocalDb> {
  const SQL = await initSqlJs({});
  const sqlite = new SQL.Database();
  for (const statement of schemaStatements(0, [])) sqlite.run(statement);
  return drizzle(sqlite, { schema, casing: "snake_case" });
}
