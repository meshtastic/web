import { drizzle } from "drizzle-orm/sqlite-proxy";
import { SQLocalDrizzle } from "sqlocal/drizzle";
import * as schema from "./schema";

/**
 * Database client singleton
 */
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

  /**
   * Initialize the database
   * This creates the sqlocal instance and runs migrations
   */
  async init(): Promise<void> {
    // If already initialized, return
    if (this.drizzleDb) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this._init();
    await this.initPromise;
    this.initPromise = null;
  }

  private async _init(): Promise<void> {
    console.log("[DB] Initializing database...");

    // Create SQLocalDrizzle instance and get the driver
    this.sqlocalDrizzle = new SQLocalDrizzle("meshtastic.db");
    const { driver } = this.sqlocalDrizzle;

    // Create Drizzle instance with the SQLocalDrizzle driver
    this.drizzleDb = drizzle(driver, { schema });

    // Run migrations (create tables)
    await this.runMigrations();

    console.log("[DB] Database initialized successfully");
  }

  /**
   * Run migrations to create tables
   */
  private async runMigrations(): Promise<void> {
    if (!this.sqlocalDrizzle) {
      throw new Error("Database not initialized");
    }

    console.log("[DB] Running migrations...");

    // Get raw SQL access for migrations
    const { sql } = this.sqlocalDrizzle;

    // Create all tables from schema
    // This is a simplified approach - in production you'd use drizzle-kit migrations
    const migrations = [
      // Messages table
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        message_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('direct', 'broadcast')),
        channel_id INTEGER NOT NULL,
        from_node INTEGER NOT NULL,
        to_node INTEGER NOT NULL,
        message TEXT NOT NULL,
        date INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        state TEXT NOT NULL CHECK(state IN ('waiting', 'sending', 'sent', 'ack', 'failed')),
        rx_snr REAL NOT NULL DEFAULT 0,
        rx_rssi REAL NOT NULL DEFAULT 0,
        via_mqtt INTEGER NOT NULL DEFAULT 0,
        hops INTEGER NOT NULL DEFAULT 0,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        received_ack INTEGER NOT NULL DEFAULT 0,
        ack_error INTEGER NOT NULL DEFAULT 0,
        ack_timestamp INTEGER,
        ack_snr REAL DEFAULT 0,
        real_ack INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE INDEX IF NOT EXISTS messages_device_idx ON messages(device_id)`,
      `CREATE INDEX IF NOT EXISTS messages_device_date_idx ON messages(device_id, date)`,
      `CREATE INDEX IF NOT EXISTS messages_device_type_idx ON messages(device_id, type)`,
      `CREATE INDEX IF NOT EXISTS messages_direct_convo_idx ON messages(device_id, type, from_node, to_node, date)`,
      `CREATE INDEX IF NOT EXISTS messages_broadcast_channel_idx ON messages(device_id, type, channel_id, date)`,
      `CREATE INDEX IF NOT EXISTS messages_state_idx ON messages(device_id, state)`,

      // Nodes table
      `CREATE TABLE IF NOT EXISTS nodes (
        device_id INTEGER NOT NULL,
        node_num INTEGER NOT NULL,
        last_heard INTEGER,
        snr REAL DEFAULT 0,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        is_ignored INTEGER NOT NULL DEFAULT 0,
        user_id TEXT,
        long_name TEXT,
        short_name TEXT,
        macaddr TEXT,
        hw_model INTEGER,
        role INTEGER,
        public_key TEXT,
        is_licensed INTEGER DEFAULT 0,
        latitude_i INTEGER,
        longitude_i INTEGER,
        altitude INTEGER,
        position_time INTEGER,
        position_precision_bits INTEGER,
        ground_speed INTEGER,
        ground_track INTEGER,
        sats_in_view INTEGER,
        battery_level INTEGER,
        voltage REAL,
        channel_utilization REAL,
        air_util_tx REAL,
        uptime_seconds INTEGER,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        PRIMARY KEY (device_id, node_num)
      )`,
      `CREATE INDEX IF NOT EXISTS nodes_device_idx ON nodes(device_id)`,
      `CREATE INDEX IF NOT EXISTS nodes_last_heard_idx ON nodes(device_id, last_heard)`,
      `CREATE INDEX IF NOT EXISTS nodes_spatial_idx ON nodes(latitude_i, longitude_i)`,
      `CREATE INDEX IF NOT EXISTS nodes_favorite_idx ON nodes(device_id, is_favorite)`,

      // Channels table
      `CREATE TABLE IF NOT EXISTS channels (
        device_id INTEGER NOT NULL,
        channel_index INTEGER NOT NULL,
        role INTEGER NOT NULL,
        name TEXT,
        psk TEXT,
        uplink_enabled INTEGER DEFAULT 0,
        downlink_enabled INTEGER DEFAULT 0,
        position_precision INTEGER DEFAULT 32,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        PRIMARY KEY (device_id, channel_index)
      )`,
      `CREATE INDEX IF NOT EXISTS channels_device_idx ON channels(device_id)`,

      // Position logs table
      `CREATE TABLE IF NOT EXISTS position_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        node_num INTEGER NOT NULL,
        latitude_i INTEGER,
        longitude_i INTEGER,
        altitude INTEGER,
        time INTEGER,
        precision_bits INTEGER,
        ground_speed INTEGER,
        ground_track INTEGER,
        sats_in_view INTEGER,
        rx_time INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )`,
      `CREATE INDEX IF NOT EXISTS position_logs_node_time_idx ON position_logs(device_id, node_num, time)`,
      `CREATE INDEX IF NOT EXISTS position_logs_device_time_idx ON position_logs(device_id, time)`,
      `CREATE INDEX IF NOT EXISTS position_logs_spatial_idx ON position_logs(latitude_i, longitude_i)`,

      // Packet logs table
      `CREATE TABLE IF NOT EXISTS packet_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        from_node INTEGER NOT NULL,
        to_node INTEGER,
        channel INTEGER,
        packet_id INTEGER,
        hop_limit INTEGER,
        hop_start INTEGER,
        want_ack INTEGER,
        rx_snr REAL,
        rx_rssi REAL,
        rx_time INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )`,
      `CREATE INDEX IF NOT EXISTS packet_logs_from_node_idx ON packet_logs(device_id, from_node, rx_time)`,
      `CREATE INDEX IF NOT EXISTS packet_logs_device_time_idx ON packet_logs(device_id, rx_time)`,

      // Telemetry logs table
      `CREATE TABLE IF NOT EXISTS telemetry_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        node_num INTEGER NOT NULL,
        battery_level INTEGER,
        voltage REAL,
        channel_utilization REAL,
        air_util_tx REAL,
        uptime_seconds INTEGER,
        temperature REAL,
        relative_humidity REAL,
        barometric_pressure REAL,
        current REAL,
        time INTEGER,
        rx_time INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )`,
      `CREATE INDEX IF NOT EXISTS telemetry_logs_node_time_idx ON telemetry_logs(device_id, node_num, time)`,
      `CREATE INDEX IF NOT EXISTS telemetry_logs_device_time_idx ON telemetry_logs(device_id, time)`,

      // Message drafts table
      `CREATE TABLE IF NOT EXISTS message_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('direct', 'broadcast')),
        target_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        UNIQUE(device_id, type, target_id)
      )`,

      // Last read table
      `CREATE TABLE IF NOT EXISTS last_read (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('direct', 'broadcast')),
        conversation_id TEXT NOT NULL,
        message_id INTEGER NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        UNIQUE(device_id, type, conversation_id)
      )`,

      // Connections table
      `CREATE TABLE IF NOT EXISTS connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('http', 'bluetooth', 'serial')),
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'disconnected' CHECK(status IN ('connected', 'connecting', 'disconnected', 'disconnecting', 'configuring', 'configured', 'online', 'error')),
        error TEXT,
        mesh_device_id INTEGER,
        url TEXT,
        device_id TEXT,
        device_name TEXT,
        gatt_service_uuid TEXT,
        usb_vendor_id INTEGER,
        usb_product_id INTEGER,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        last_connected_at INTEGER,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )`,
      `CREATE INDEX IF NOT EXISTS connections_default_idx ON connections(is_default)`,
      `CREATE INDEX IF NOT EXISTS connections_type_idx ON connections(type)`,
    ];

    for (const migration of migrations) {
      await sql(migration);
    }

    console.log("[DB] Migrations completed");
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
    if (!this.sqlocalDrizzle) {
      throw new Error("Database not initialized. Call init() first.");
    }
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
      console.log("[DB] Database closed");
    }
  }

  /**
   * Delete all data from all tables (for testing/reset)
   */
  async deleteAll(): Promise<void> {
    const { sql } = this;

    console.log("[DB] Deleting all data...");

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

    console.log("[DB] All data deleted");
  }
}

// Export singleton instance
export const dbClient = DatabaseClient.getInstance();

// Export the db getter for convenience
export const getDb = () => dbClient.db;

// Export for direct SQL access
export const getSql = () => dbClient.sql;
