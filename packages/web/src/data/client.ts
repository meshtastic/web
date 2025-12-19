import { drizzle } from "drizzle-orm/sqlite-proxy";
import { SQLocalDrizzle } from "sqlocal/drizzle";
import logger from "../core/services/logger.ts";
import migration0000 from "./migrations/0000_same_peter_quill.sql?raw";
import migration0001 from "./migrations/0001_strange_scream.sql?raw";
import * as schema from "./schema.ts";

const migrations = [
  { id: "0000_same_peter_quill", sql: migration0000 },
  { id: "0001_strange_scream", sql: migration0001 },
];

class DatabaseClient {
  private static instance: DatabaseClient;
  private sqlocalDrizzle: SQLocalDrizzle | null = null;
  private drizzleDb: ReturnType<typeof drizzle> | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  async init(): Promise<void> {
    // If already initialized, return
    if (this.drizzleDb) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this._init();
    await this.initPromise;
    this.initPromise = null;
  }

  private async _init(): Promise<void> {
    logger.debug("[DB] Initializing database...");

    // Create SQLocalDrizzle instance and get the driver
    this.sqlocalDrizzle = new SQLocalDrizzle("meshtastic.db");
    const { driver } = this.sqlocalDrizzle;

    // Create Drizzle instance with the SQLocalDrizzle driver
    this.drizzleDb = drizzle(driver, { schema });

    // Run migrations
    await this.runMigrations();

    logger.debug("[DB] Database initialized successfully");
  }

  /**
   * Run migrations from drizzle-kit generated SQL files
   * Tracks applied migrations in a __drizzle_migrations table
   */
  private async runMigrations(): Promise<void> {
    if (!this.sqlocalDrizzle) {
      throw new Error("Database not initialized");
    }

    logger.debug("[DB] Running migrations...");

    const { sql } = this.sqlocalDrizzle;

    // Create migrations tracking table if it doesn't exist
    await sql(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_id TEXT NOT NULL UNIQUE,
        applied_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )
    `);

    // Check if we have an existing database without migration tracking
    // (database was created before we added migration tracking)
    const existingTables = await sql<{ name: string }[]>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'`,
    );
    const appliedMigrations = await sql<{ migration_id: string }[]>(
      `SELECT migration_id FROM __drizzle_migrations`,
    );

    // If tables exist but no migrations are recorded, we need to seed the migration table
    // This handles databases created before we added migration tracking
    if (existingTables.length > 0 && appliedMigrations.length === 0) {
      logger.debug(
        "[DB] Detected existing database without migration tracking, seeding migration history...",
      );

      // Mark all migrations as applied since the schema already exists
      for (const migration of migrations) {
        await sql(
          `INSERT INTO __drizzle_migrations (migration_id) VALUES ('${migration.id}')`,
        );
      }
      logger.debug("[DB] Migration history seeded");
    }

    const appliedSet = new Set(
      appliedMigrations.map((row) => row.migration_id),
    );

    // Run each migration that hasn't been applied yet
    for (const migration of migrations) {
      if (appliedSet.has(migration.id)) {
        logger.debug(`[DB] Migration ${migration.id} already applied, skipping`);
        continue;
      }

      logger.debug(`[DB] Applying migration ${migration.id}...`);

      // Split by statement breakpoint and execute each statement
      const statements = migration.sql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        await sql(statement);
      }

      // Record that this migration has been applied
      await sql(
        `INSERT INTO __drizzle_migrations (migration_id) VALUES ('${migration.id}')`,
      );

      logger.debug(`[DB] Migration ${migration.id} applied successfully`);
    }

    logger.debug("[DB] Migrations completed");
  }

  /**
   * Get the Drizzle database instance
   */
  get db() {
    if (!this.drizzleDb) {
      throw new Error("Database not initialized. Call init() first.");
    }
    return this.drizzleDb;
  }

  /**
   * Get raw SQL access for direct queries
   */
  get sql() {
    return this.sqlocalDrizzle.sql;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.sqlocalDrizzle) {
      // sqlocal doesn't have a close method, but we can cleanup
      this.sqlocalDrizzle = null;
      this.drizzleDb = null;
      logger.debug("[DB] Database closed");
    }
  }

  /**
   * Delete all data from all tables (for testing/reset)
   */
  async deleteAll(): Promise<void> {
    const { sql } = this;

    logger.debug("[DB] Deleting all data...");

    const tables = [
      "messages",
      "nodes",
      "channels",
      "position_logs",
      "packet_logs",
      "telemetry_logs",
      "message_drafts",
      "last_read",
    ];

    for (const table of tables) {
      await sql(`DELETE FROM ${table}`);
    }

    logger.debug("[DB] All data deleted");
  }
}

// Export singleton instance
export const dbClient = DatabaseClient.getInstance();

// Export the db getter for convenience
export const getDb = () => dbClient.db;

// Export for direct SQL access
export const getSql = () => dbClient.sql;
