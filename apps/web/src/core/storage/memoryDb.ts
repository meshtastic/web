import { drizzle } from "drizzle-orm/sql-js";
import initSqlJs from "sql.js";
import type { RunAtomically } from "./adopt.ts";
import type { SqlocalDb } from "./db.ts";
import * as schema from "./schema.ts";
import { schemaStatements } from "./schema.ts";

/**
 * In-memory database backed by sql.js, for tests and other Node contexts.
 * Same Drizzle interface as the production sqlocal connection so repository
 * code is portable between browser and test runs.
 */
export async function createMemoryDb(): Promise<SqlocalDb> {
  return (await createMemoryStorage()).db;
}

/** `createMemoryDb`, with a transaction runner like the production one. */
export async function createMemoryStorage(): Promise<{
  db: SqlocalDb;
  atomic: RunAtomically;
}> {
  const SQL = await initSqlJs({});
  const sqlite = new SQL.Database();
  for (const statement of schemaStatements(0, [])) sqlite.run(statement);
  const atomic: RunAtomically = async (statements) => {
    sqlite.run("BEGIN");
    try {
      for (const s of statements) sqlite.run(s.sql, [...s.params]);
      sqlite.run("COMMIT");
    } catch (e) {
      sqlite.run("ROLLBACK");
      throw e;
    }
  };
  return { db: drizzle(sqlite, { schema, casing: "snake_case" }), atomic };
}
