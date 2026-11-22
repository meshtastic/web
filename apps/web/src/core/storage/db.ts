import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { SQLocalDrizzle } from "sqlocal/drizzle";
import {
  discardStatements,
  type RunAtomically,
  type SqlStatement,
} from "./adopt.ts";
import * as schema from "./schema.ts";
import { DATABASE_FILE, SCHEMA_VERSION, schemaStatements } from "./schema.ts";

export interface CreateSqlocalDbOptions {
  /** OPFS path. Defaults to `DATABASE_FILE`. */
  databasePath?: string;
}

export type SqlocalDb = BaseSQLiteDatabase<
  "async" | "sync",
  unknown,
  typeof schema
>;

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
  /** Runs statements as one sqlocal batch, which is a single transaction. */
  atomic: RunAtomically;
  /** Disconnects from the database and stops its worker, releasing the OPFS handle. */
  close: () => Promise<void>;
}

/**
 * Opens (or creates) the OPFS-backed SQLite database, applies the schema, and
 * returns a Drizzle client typed against the schema, along with where sqlocal
 * ended up storing it. One instance per origin — sqlocal serializes writes
 * via Web Locks under the hood.
 */
export async function openSqlocalDb(
  options: CreateSqlocalDbOptions = {},
): Promise<OpenedSqlocalDb> {
  const databasePath = options.databasePath ?? DATABASE_FILE;
  const client = new SQLocalDrizzle({ databasePath });
  const { driver, batchDriver, sql } = client;
  const db: SqlocalDb = drizzle(driver, batchDriver, {
    schema,
    casing: "snake_case",
  });

  await applySchema(sql);
  const atomic: RunAtomically = async (statements) => {
    await client.batch(() => statements.map(toSqlocalStatement));
  };
  // Rows a connection wrote before its radio was named belong to no radio;
  // any a previous page left behind (it closed mid-handshake) go now. They
  // are harmless if they stay, so a failure here must not cost persistence.
  try {
    await atomic(discardStatements());
  } catch (err) {
    console.warn("openSqlocalDb: could not drop provisional rows", err);
  }

  const { storageType = "memory" } = await client.getDatabaseInfo();
  return {
    db,
    storageType,
    persistent: storageType === "opfs",
    atomic,
    close: () => client.destroy(),
  };
}

function toSqlocalStatement(statement: SqlStatement): {
  sql: string;
  params: unknown[];
} {
  return { sql: statement.sql, params: [...statement.params] };
}

export type RawSql = (
  query: TemplateStringsArray,
  ...values: ReadonlyArray<unknown>
) => Promise<unknown>;

/**
 * Creates the schema, or wipes and recreates it when the file carries
 * another schema version (see `schemaStatements`). Runs in one
 * `BEGIN IMMEDIATE` transaction, so another tab opening the same file waits
 * instead of seeing (or wiping) a half-built schema, and a failure leaves the
 * file as it was.
 */
export async function applySchema(sql: RawSql): Promise<void> {
  await sql`BEGIN IMMEDIATE`;
  try {
    const version = numberField(await sql`PRAGMA user_version`, "user_version");
    const tables =
      version === SCHEMA_VERSION
        ? []
        : stringFields(
            await sql`SELECT name FROM sqlite_master WHERE type = 'table'`,
            "name",
          );
    for (const statement of schemaStatements(version, tables)) {
      await sql(literal(statement));
    }
    await sql`COMMIT`;
  } catch (e) {
    await sql`ROLLBACK`.catch(() => {});
    throw e;
  }
}

function literal(statement: string): TemplateStringsArray {
  return Object.assign([statement], { raw: [statement] });
}

function rowsOf(rows: unknown): ReadonlyArray<object> {
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (row): row is object => typeof row === "object" && row !== null,
  );
}

function numberField(rows: unknown, field: string): number {
  const first = rowsOf(rows)[0];
  const value: unknown = first ? Reflect.get(first, field) : undefined;
  return typeof value === "number" ? value : 0;
}

function stringFields(rows: unknown, field: string): string[] {
  return rowsOf(rows).flatMap((row) => {
    const value: unknown = Reflect.get(row, field);
    return typeof value === "string" ? [value] : [];
  });
}
