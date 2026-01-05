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
 * Devices table - anchor table for all device-scoped data
 * All other tables reference this via ownerNodeNum with cascade delete
 */
export const devices = sqliteTable("devices", {
  nodeNum: integer("node_num").primaryKey(),
  shortName: text("short_name"),
  longName: text("long_name"),
  hwModel: integer("hw_model"),
  firstSeen: integer("first_seen", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  lastSeen: integer("last_seen", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;

/**
 * Messages table - stores all direct and channel messages
 */
export const messages = sqliteTable(
  "messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Device identity - the node number of the device that owns this data
    ownerNodeNum: integer("owner_node_num")
      .notNull()
      .references(() => devices.nodeNum, { onDelete: "cascade" }),

    // Message metadata
    messageId: integer("message_id").notNull(), // Original packet message ID
    type: text("type", { enum: ["direct", "channel"] }).notNull(),
    channelId: integer("channel_id").notNull(),

    // Participants
    fromNode: integer("from_node").notNull(),
    toNode: integer("to_node").notNull(), // For channel messages, this is typically 0xFFFFFFFF

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

    // Reply support - references the messageId of the message being replied to
    replyId: integer("reply_id"),
  },
  (table) => [
    // Unique constraint for deduplication (same message ID per device)
    unique("messages_owner_message_id_unique").on(
      table.ownerNodeNum,
      table.messageId,
    ),
    // Indexes for common query patterns
    index("messages_owner_idx").on(table.ownerNodeNum),
    index("messages_owner_date_idx").on(table.ownerNodeNum, table.date),
    index("messages_owner_type_idx").on(table.ownerNodeNum, table.type),
    // Direct message queries: device + participants + date
    index("messages_direct_convo_idx").on(
      table.ownerNodeNum,
      table.type,
      table.fromNode,
      table.toNode,
      table.date,
    ),
    // Channel queries: device + channel + date
    index("messages_channel_idx").on(
      table.ownerNodeNum,
      table.type,
      table.channelId,
      table.date,
    ),
    // For finding unacked messages
    index("messages_state_idx").on(table.ownerNodeNum, table.state),
  ],
);

/**
 * Nodes table - stores current node information
 * This is the "hot" table with current node state
 */
export const nodes = sqliteTable(
  "nodes",
  {
    // Composite primary key (ownerNodeNum + nodeNum)
    // ownerNodeNum = the device's own node number that reported this data
    // nodeNum = the remote node this record is about
    ownerNodeNum: integer("owner_node_num")
      .notNull()
      .references(() => devices.nodeNum, { onDelete: "cascade" }),
    nodeNum: integer("node_num").notNull(),

    // Node metadata
    lastHeard: integer("last_heard", { mode: "timestamp" }), // Unix timestamp in seconds
    snr: real("snr").default(0),

    isFavorite: integer("is_favorite", { mode: "boolean" })
      .notNull()
      .default(false),
    isIgnored: integer("is_ignored", { mode: "boolean" })
      .notNull()
      .default(false),

    // User info
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
    privateNote: text("private_note"),

    // Timestamps
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    // Composite primary key - ensures deduplication
    primaryKey({ columns: [table.ownerNodeNum, table.nodeNum] }),
    // Query by owner device
    index("nodes_owner_idx").on(table.ownerNodeNum),
    // Query recently heard nodes
    index("nodes_last_heard_idx").on(table.ownerNodeNum, table.lastHeard),
    // Spatial queries (nodes in area)
    index("nodes_spatial_idx").on(table.latitudeI, table.longitudeI),
    // Favorites
    index("nodes_favorite_idx").on(table.ownerNodeNum, table.isFavorite),
  ],
);

/**
 * Channels table - stores channel configuration per device
 */
export const channels = sqliteTable(
  "channels",
  {
    // Composite primary key (ownerNodeNum + channelIndex)
    // ownerNodeNum = the device's own node number that owns these channels
    ownerNodeNum: integer("owner_node_num")
      .notNull()
      .references(() => devices.nodeNum, { onDelete: "cascade" }),
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
    primaryKey({ columns: [table.ownerNodeNum, table.channelIndex] }),
    // Query by device
    index("channels_owner_idx").on(table.ownerNodeNum),
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

    // ownerNodeNum = the device's own node number that reported this data
    // nodeNum = the remote node whose position this is
    ownerNodeNum: integer("owner_node_num")
      .notNull()
      .references(() => devices.nodeNum, { onDelete: "cascade" }),
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
      table.ownerNodeNum,
      table.nodeNum,
      table.time,
    ),
    // Query all positions in time range
    index("position_logs_owner_time_idx").on(table.ownerNodeNum, table.time),
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

    // Device identity - the node number of the device that received this packet
    ownerNodeNum: integer("owner_node_num")
      .notNull()
      .references(() => devices.nodeNum, { onDelete: "cascade" }),

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
      table.ownerNodeNum,
      table.fromNode,
      table.rxTime,
    ),
    // Query packets by time
    index("packet_logs_owner_time_idx").on(table.ownerNodeNum, table.rxTime),
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

    // ownerNodeNum = the device's own node number that reported this data
    // nodeNum = the remote node whose telemetry this is
    ownerNodeNum: integer("owner_node_num")
      .notNull()
      .references(() => devices.nodeNum, { onDelete: "cascade" }),
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
      table.ownerNodeNum,
      table.nodeNum,
      table.time,
    ),
    // Query all telemetry in time range
    index("telemetry_logs_owner_time_idx").on(table.ownerNodeNum, table.time),
  ],
);

/**
 * Message drafts - per-conversation draft messages
 */
export const messageDrafts = sqliteTable(
  "message_drafts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Device identity - the node number of the device that owns this draft
    ownerNodeNum: integer("owner_node_num")
      .notNull()
      .references(() => devices.nodeNum, { onDelete: "cascade" }),
    type: text("type", { enum: ["direct", "channel"] }).notNull(),

    // For direct: nodeNum of recipient
    // For channel: channelId
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
    unique("message_drafts_owner_unique_idx").on(
      table.ownerNodeNum,
      table.type,
      table.targetId,
    ),
  ],
);

/**
 * Connections table - stores saved connection configurations
 * One device can have many saved connections (HTTP, Bluetooth, Serial)
 */
export const connections = sqliteTable(
  "connections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Device this connection belongs to (set after first successful connection)
    // Nullable because nodeNum isn't known until first connection
    nodeNum: integer("node_num").references(() => devices.nodeNum, {
      onDelete: "cascade",
    }),

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

    // Device identity - the node number of the device that owns this data
    ownerNodeNum: integer("owner_node_num")
      .notNull()
      .references(() => devices.nodeNum, { onDelete: "cascade" }),
    type: text("type", { enum: ["direct", "channel"] }).notNull(),

    // For direct: conversation ID (formatted as "nodeA:nodeB")
    // For channel: channelId
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
    unique("last_read_owner_unique_idx").on(
      table.ownerNodeNum,
      table.type,
      table.conversationId,
    ),
  ],
);

/**
 * Traceroute logs - historical traceroute results
 * Stores route discovery data for analyzing network topology
 */
export const tracerouteLogs = sqliteTable(
  "traceroute_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Device identity - the node number of the device that owns this data
    ownerNodeNum: integer("owner_node_num")
      .notNull()
      .references(() => devices.nodeNum, { onDelete: "cascade" }),

    // Target node
    targetNodeNum: integer("target_node_num").notNull(),

    // Route data (stored as JSON arrays)
    route: text("route", { mode: "json" }).$type<number[]>().notNull(),
    routeBack: text("route_back", { mode: "json" }).$type<number[]>(),
    snrTowards: text("snr_towards", { mode: "json" }).$type<number[]>(),
    snrBack: text("snr_back", { mode: "json" }).$type<number[]>(),

    // Timing
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    // Query traceroutes for a specific target
    index("traceroute_logs_target_idx").on(
      table.ownerNodeNum,
      table.targetNodeNum,
      table.createdAt,
    ),
    // Query all traceroutes by time
    index("traceroute_logs_owner_time_idx").on(
      table.ownerNodeNum,
      table.createdAt,
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

export type TracerouteLog = typeof tracerouteLogs.$inferSelect;
export type NewTracerouteLog = typeof tracerouteLogs.$inferInsert;

/**
 * Device configs - cached device and module configuration
 * Enables instant UI on reconnect and change detection
 */
export const deviceConfigs = sqliteTable(
  "device_configs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Device identity - the node number of the device that owns this config
    ownerNodeNum: integer("owner_node_num")
      .notNull()
      .references(() => devices.nodeNum, { onDelete: "cascade" }),

    // Config data (stored as JSON)
    config: text("config", { mode: "json" }).notNull(), // LocalConfig
    moduleConfig: text("module_config", { mode: "json" }).notNull(), // LocalModuleConfig

    // Sync metadata
    configHash: text("config_hash"), // SHA-256 for quick comparison
    configVersion: integer("config_version"), // From firmware (when available)

    // Firmware info
    firmwareVersion: text("firmware_version"),

    // Timestamps
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    // One config cache per device
    unique("device_configs_owner_unique").on(table.ownerNodeNum),
    index("device_configs_owner_idx").on(table.ownerNodeNum),
  ],
);

/**
 * Config changes - track pending local changes separately from synced config
 * Enables preserving unsaved edits across reconnects and detecting conflicts
 */
export const configChanges = sqliteTable(
  "config_changes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    // Device identity - the node number of the device that owns this data
    ownerNodeNum: integer("owner_node_num")
      .notNull()
      .references(() => devices.nodeNum, { onDelete: "cascade" }),

    // Change identification
    changeType: text("change_type", {
      enum: ["config", "moduleConfig", "channel", "user"],
    }).notNull(),
    variant: text("variant"), // e.g., "device", "lora", "mqtt"
    channelIndex: integer("channel_index"), // For channel changes

    // Change data
    fieldPath: text("field_path"), // Dot-separated path within the config (e.g., "region", "txPower")
    value: text("value", { mode: "json" }).notNull(),
    originalValue: text("original_value", { mode: "json" }),

    // Conflict tracking
    hasConflict: integer("has_conflict", { mode: "boolean" })
      .notNull()
      .default(false),
    remoteValue: text("remote_value", { mode: "json" }), // Value from device when conflict detected

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    // Unique per change type/variant/channel/field
    unique("config_changes_owner_unique").on(
      table.ownerNodeNum,
      table.changeType,
      table.variant,
      table.channelIndex,
      table.fieldPath,
    ),
    index("config_changes_owner_idx").on(table.ownerNodeNum),
    index("config_changes_conflict_idx").on(
      table.ownerNodeNum,
      table.hasConflict,
    ),
  ],
);

export type DeviceConfig = typeof deviceConfigs.$inferSelect;
export type NewDeviceConfig = typeof deviceConfigs.$inferInsert;

export type ConfigChange = typeof configChanges.$inferSelect;
export type NewConfigChange = typeof configChanges.$inferInsert;
