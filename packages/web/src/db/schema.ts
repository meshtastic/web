import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

/**
 * Messages table - stores all direct and broadcast messages
 */
export const messages = sqliteTable(
  "messages",
  {
    // Primary key
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Foreign keys
    deviceId: integer("device_id").notNull(),

    // Message metadata
    messageId: integer("message_id").notNull(), // Original packet message ID
    type: text("type", { enum: ["direct", "broadcast"] }).notNull(),
    channelId: integer("channel_id").notNull(),

    // Participants
    fromNode: integer("from_node").notNull(),
    toNode: integer("to_node").notNull(), // For broadcast, this is typically 0xFFFFFFFF

    // Message content
    message: text("message").notNull(),

    // Timestamps
    date: integer("date", { mode: "timestamp_ms" }).notNull(), // When message was sent
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),

    // Message state
    state: text("state", {
      enum: ["waiting", "sending", "sent", "ack", "failed"],
    }).notNull(),

    // Radio metadata
    rxSnr: real("rx_snr").notNull().default(0),
    rxRssi: real("rx_rssi").notNull().default(0),
    viaMqtt: integer("via_mqtt", { mode: "boolean" }).notNull().default(false),
    hops: integer("hops").notNull().default(0),

    // Delivery tracking
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    receivedACK: integer("received_ack", { mode: "boolean" })
      .notNull()
      .default(false),
    ackError: integer("ack_error").notNull().default(0),
    ackTimestamp: integer("ack_timestamp", { mode: "timestamp_ms" }),
    ackSNR: real("ack_snr").default(0),
    realACK: integer("real_ack", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    // Indexes for common query patterns
    index("messages_device_idx").on(table.deviceId),
    index("messages_device_date_idx").on(table.deviceId, table.date),
    index("messages_device_type_idx").on(table.deviceId, table.type),
    // Direct message queries: device + participants + date
    index("messages_direct_convo_idx").on(
      table.deviceId,
      table.type,
      table.fromNode,
      table.toNode,
      table.date,
    ),
    // Broadcast queries: device + channel + date
    index("messages_broadcast_channel_idx").on(
      table.deviceId,
      table.type,
      table.channelId,
      table.date,
    ),
    // For finding unacked messages
    index("messages_state_idx").on(table.deviceId, table.state),
  ],
);

/**
 * Nodes table - stores current node information
 * This is the "hot" table with current node state
 */
export const nodes = sqliteTable(
  "nodes",
  {
    // Composite primary key (deviceId + nodeNum)
    deviceId: integer("device_id").notNull(),
    nodeNum: integer("node_num").notNull(),

    // Node metadata
    lastHeard: integer("last_heard", { mode: "timestamp" }), // Unix timestamp in seconds
    snr: real("snr").default(0),

    // User preferences (not from radio)
    isFavorite: integer("is_favorite", { mode: "boolean" })
      .notNull()
      .default(false),
    isIgnored: integer("is_ignored", { mode: "boolean" })
      .notNull()
      .default(false),

    // User info (from radio)
    userId: text("user_id"),
    longName: text("long_name"),
    shortName: text("short_name"),
    macaddr: text("macaddr"), // Stored as blob in protobuf, but hex string here
    hwModel: integer("hw_model"), // Enum value
    role: integer("role"), // Enum value
    publicKey: text("public_key"), // Stored as blob in protobuf, but base64 here
    isLicensed: integer("is_licensed", { mode: "boolean" }).default(false),

    // Current position (latest only - history in position_logs)
    latitudeI: integer("latitude_i"), // lat * 1e7 (as in protobuf)
    longitudeI: integer("longitude_i"), // lon * 1e7
    altitude: integer("altitude"),
    positionTime: integer("position_time", { mode: "timestamp" }), // Unix timestamp
    positionPrecisionBits: integer("position_precision_bits"),
    groundSpeed: integer("ground_speed"),
    groundTrack: integer("ground_track"),
    satsInView: integer("sats_in_view"),

    // Current device metrics (latest only)
    batteryLevel: integer("battery_level"),
    voltage: real("voltage"),
    channelUtilization: real("channel_utilization"),
    airUtilTx: real("air_util_tx"),
    uptimeSeconds: integer("uptime_seconds"),

    // Timestamps
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    // Composite primary key - ensures deduplication
    primaryKey({ columns: [table.deviceId, table.nodeNum] }),
    // Query by device
    index("nodes_device_idx").on(table.deviceId),
    // Query recently heard nodes
    index("nodes_last_heard_idx").on(table.deviceId, table.lastHeard),
    // Spatial queries (nodes in area)
    index("nodes_spatial_idx").on(table.latitudeI, table.longitudeI),
    // Favorites
    index("nodes_favorite_idx").on(table.deviceId, table.isFavorite),
  ],
);

/**
 * Channels table - stores channel configuration per device
 */
export const channels = sqliteTable(
  "channels",
  {
    // Composite primary key (deviceId + channelIndex)
    deviceId: integer("device_id").notNull(),
    channelIndex: integer("channel_index").notNull(), // 0-7

    // Channel metadata
    role: integer("role").notNull(), // PRIMARY = 1, SECONDARY = 2, DISABLED = 0

    // Channel settings
    name: text("name"),
    psk: text("psk"), // Base64-encoded pre-shared key
    uplinkEnabled: integer("uplink_enabled", { mode: "boolean" }).default(
      false,
    ),
    downlinkEnabled: integer("downlink_enabled", { mode: "boolean" }).default(
      false,
    ),

    // Module settings
    positionPrecision: integer("position_precision").default(32),

    // Timestamps
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    // Composite primary key
    primaryKey({ columns: [table.deviceId, table.channelIndex] }),
    // Query by device
    index("channels_device_idx").on(table.deviceId),
  ],
);

/**
 * Position logs - historical position data
 * For tracking node movement over time
 */
export const positionLogs = sqliteTable(
  "position_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Foreign keys
    deviceId: integer("device_id").notNull(),
    nodeNum: integer("node_num").notNull(),

    // Position data (same format as nodes table)
    latitudeI: integer("latitude_i"),
    longitudeI: integer("longitude_i"),
    altitude: integer("altitude"),
    time: integer("time", { mode: "timestamp" }), // Position timestamp from packet
    precisionBits: integer("precision_bits"),
    groundSpeed: integer("ground_speed"),
    groundTrack: integer("ground_track"),
    satsInView: integer("sats_in_view"),

    // When we received this position
    rxTime: integer("rx_time", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    // Query position history for a node
    index("position_logs_node_time_idx").on(
      table.deviceId,
      table.nodeNum,
      table.time,
    ),
    // Query all positions in time range
    index("position_logs_device_time_idx").on(table.deviceId, table.time),
    // Spatial queries
    index("position_logs_spatial_idx").on(table.latitudeI, table.longitudeI),
  ],
);

/**
 * Packet logs - raw packet metadata for debugging/analytics
 * Stores minimal metadata about every packet received
 */
export const packetLogs = sqliteTable(
  "packet_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Foreign keys
    deviceId: integer("device_id").notNull(),

    // Packet metadata
    fromNode: integer("from_node").notNull(),
    toNode: integer("to_node"),
    channel: integer("channel"),
    packetId: integer("packet_id"),

    // Routing
    hopLimit: integer("hop_limit"),
    hopStart: integer("hop_start"),
    wantAck: integer("want_ack", { mode: "boolean" }),

    // Radio metrics
    rxSnr: real("rx_snr"),
    rxRssi: real("rx_rssi"),

    // Timing
    rxTime: integer("rx_time", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),

    // Store decoded packet as JSON
    rawPacket: text("raw_packet", { mode: "json" }),
  },
  (table) => [
    // Query packets from a node
    index("packet_logs_from_node_idx").on(
      table.deviceId,
      table.fromNode,
      table.rxTime,
    ),
    // Query packets by time
    index("packet_logs_device_time_idx").on(table.deviceId, table.rxTime),
  ],
);

/**
 * Telemetry logs - historical device metrics
 * For tracking battery, signal, environmental data over time
 */
export const telemetryLogs = sqliteTable(
  "telemetry_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Foreign keys
    deviceId: integer("device_id").notNull(),
    nodeNum: integer("node_num").notNull(),

    // Device metrics
    batteryLevel: integer("battery_level"),
    voltage: real("voltage"),
    channelUtilization: real("channel_utilization"),
    airUtilTx: real("air_util_tx"),
    uptimeSeconds: integer("uptime_seconds"),

    // Environmental metrics (if available)
    temperature: real("temperature"),
    relativeHumidity: real("relative_humidity"),
    barometricPressure: real("barometric_pressure"),

    // Power metrics (if available)
    current: real("current"),

    // Timing
    time: integer("time", { mode: "timestamp" }), // Telemetry timestamp from packet
    rxTime: integer("rx_time", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    // Query telemetry history for a node
    index("telemetry_logs_node_time_idx").on(
      table.deviceId,
      table.nodeNum,
      table.time,
    ),
    // Query all telemetry in time range
    index("telemetry_logs_device_time_idx").on(table.deviceId, table.time),
  ],
);

/**
 * Message drafts - per-conversation draft messages
 */
export const messageDrafts = sqliteTable(
  "message_drafts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    deviceId: integer("device_id").notNull(),
    type: text("type", { enum: ["direct", "broadcast"] }).notNull(),

    // For direct: nodeNum of recipient
    // For broadcast: channelId
    targetId: integer("target_id").notNull(),

    // Draft content
    content: text("content").notNull(),

    // Timestamps
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    // One draft per conversation
    unique("message_drafts_unique_idx").on(
      table.deviceId,
      table.type,
      table.targetId,
    ),
  ],
);

/**
 * Connections table - stores saved connection configurations
 */
export const connections = sqliteTable(
  "connections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Connection type
    type: text("type", { enum: ["http", "bluetooth", "serial"] }).notNull(),

    // Display name
    name: text("name").notNull(),

    // Connection status (ephemeral, but persisted for UI state)
    status: text("status", {
      enum: [
        "connected",
        "connecting",
        "disconnected",
        "disconnecting",
        "configuring",
        "configured",
        "online",
        "error",
      ],
    })
      .notNull()
      .default("disconnected"),
    error: text("error"),

    // Link to mesh device (when connected)
    meshDeviceId: integer("mesh_device_id"),

    // HTTP-specific fields
    url: text("url"),

    // Bluetooth-specific fields
    deviceId: text("device_id"), // BluetoothDevice.id
    deviceName: text("device_name"),
    gattServiceUUID: text("gatt_service_uuid"),

    // Serial-specific fields
    usbVendorId: integer("usb_vendor_id"),
    usbProductId: integer("usb_product_id"),

    // Preferences
    isDefault: integer("is_default", { mode: "boolean" })
      .notNull()
      .default(false),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    lastConnectedAt: integer("last_connected_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    // Index for finding default connection
    index("connections_default_idx").on(table.isDefault),
    // Index for type filtering
    index("connections_type_idx").on(table.type),
  ],
);

/**
 * Preferences table - stores user preferences (key-value store)
 */
export const preferences = sqliteTable("preferences", {
  // Primary key - the preference key
  key: text("key").primaryKey(),

  // Value stored as JSON string
  value: text("value").notNull(),

  // Timestamps
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/**
 * Last read tracking - track which message was last read per conversation
 */
export const lastRead = sqliteTable(
  "last_read",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    deviceId: integer("device_id").notNull(),
    type: text("type", { enum: ["direct", "broadcast"] }).notNull(),

    // For direct: conversation ID (formatted as "nodeA:nodeB")
    // For broadcast: channelId
    conversationId: text("conversation_id").notNull(),

    // Last read message ID
    messageId: integer("message_id").notNull(),

    // Timestamp
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    // One last-read marker per conversation
    unique("last_read_unique_idx").on(
      table.deviceId,
      table.type,
      table.conversationId,
    ),
  ],
);

/**
 * Export types for TypeScript
 */
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;

export type PositionLog = typeof positionLogs.$inferSelect;
export type NewPositionLog = typeof positionLogs.$inferInsert;

export type PacketLog = typeof packetLogs.$inferSelect;
export type NewPacketLog = typeof packetLogs.$inferInsert;

export type TelemetryLog = typeof telemetryLogs.$inferSelect;
export type NewTelemetryLog = typeof telemetryLogs.$inferInsert;

export type MessageDraft = typeof messageDrafts.$inferSelect;
export type NewMessageDraft = typeof messageDrafts.$inferInsert;

export type LastRead = typeof lastRead.$inferSelect;
export type NewLastRead = typeof lastRead.$inferInsert;

export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;

export type Preference = typeof preferences.$inferSelect;
export type NewPreference = typeof preferences.$inferInsert;
