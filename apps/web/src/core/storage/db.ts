import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { SQLocalDrizzle } from "sqlocal/drizzle";
import {
  discardStatements,
  type RunAtomically,
  type SqlStatement,
} from "./adopt.ts";
import * as schema from "./schema.ts";
import {
  CURRENT_SCHEMA,
  DATABASE_FILE,
  READ_MIN_READER_SQL,
  SCHEMA_META_TABLE,
  type SchemaPlan,
  schemaStatements,
} from "./schema.ts";

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

  const atomic: RunAtomically = async (statements) => {
    await client.batch(() => statements.map(toSqlocalStatement));
  };
  let storageType: string;
  try {
    await applySchema(sql);
    // Rows a connection wrote before its radio was named belong to no radio;
    // any a previous page left behind (it closed mid-handshake) go now. They
    // are harmless if they stay, so a failure here must not cost persistence.
    try {
      await atomic(discardStatements());
    } catch (err) {
      console.warn("openSqlocalDb: could not drop provisional rows", err);
    }
    ({ storageType = "memory" } = await client.getDatabaseInfo());
  } catch (err) {
    // Nothing else holds the client: stop its worker so it lets go of the
    // file before `getStorageDb` tries again.
    await client.destroy().catch(() => {});
    throw err;
  }
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
 * Creates the schema, upgrades it through its migrations, opens a newer
 * file the app can still read as it is, or wipes and recreates it (see
 * `schemaStatements`). Runs in one `BEGIN IMMEDIATE` transaction, both
 * stamps included (`user_version` lives in the file header and
 * `schema_meta` is a table, and the transaction covers both), so a failed
 * migration leaves the file, data and stamps as they were. Another tab
 * opening the same file meanwhile waits a bounded time for the lock, then
 * fails its open; `getStorageDb` tries again on its next call.
 */
export async function applySchema(
  sql: RawSql,
  plan: SchemaPlan = CURRENT_SCHEMA,
): Promise<void> {
  await sql`BEGIN IMMEDIATE`;
  try {
    const version = numberField(await sql`PRAGMA user_version`, "user_version");
    const tables =
      version === plan.version
        ? []
        : stringFields(
            await sql`SELECT name FROM sqlite_master WHERE type = 'table'`,
            "name",
          );
    const minReader =
      version > plan.version && tables.includes(SCHEMA_META_TABLE)
        ? optionalNumberField(await sql(literal(READ_MIN_READER_SQL)), "value")
        : undefined;
    const statements = schemaStatements(
      { version, tables, ...(minReader === undefined ? {} : { minReader }) },
      plan,
    );
    for (const statement of statements) {
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
  return optionalNumberField(rows, field) ?? 0;
}

function optionalNumberField(rows: unknown, field: string): number | undefined {
  const first = rowsOf(rows)[0];
  const value: unknown = first ? Reflect.get(first, field) : undefined;
  return typeof value === "number" ? value : undefined;
}

function stringFields(rows: unknown, field: string): string[] {
  return rowsOf(rows).flatMap((row) => {
    const value: unknown = Reflect.get(row, field);
    return typeof value === "string" ? [value] : [];
  });
}
