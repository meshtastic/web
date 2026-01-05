CREATE TABLE `devices` (
	`node_num` integer PRIMARY KEY NOT NULL,
	`short_name` text,
	`long_name` text,
	`hw_model` integer,
	`first_seen` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `connections` ADD `node_num` integer REFERENCES devices(node_num);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_node_num` integer NOT NULL,
	`message_id` integer NOT NULL,
	`type` text NOT NULL,
	`channel_id` integer NOT NULL,
	`from_node` integer NOT NULL,
	`to_node` integer NOT NULL,
	`message` text NOT NULL,
	`date` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`state` text NOT NULL,
	`rx_snr` real DEFAULT 0 NOT NULL,
	`rx_rssi` real DEFAULT 0 NOT NULL,
	`via_mqtt` integer DEFAULT false NOT NULL,
	`hops` integer DEFAULT 0 NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`max_retries` integer DEFAULT 3 NOT NULL,
	`received_ack` integer DEFAULT false NOT NULL,
	`ack_error` integer DEFAULT 0 NOT NULL,
	`ack_timestamp` integer,
	`ack_snr` real DEFAULT 0,
	`real_ack` integer DEFAULT false NOT NULL,
	`reply_id` integer,
	FOREIGN KEY (`owner_node_num`) REFERENCES `devices`(`node_num`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "owner_node_num", "message_id", "type", "channel_id", "from_node", "to_node", "message", "date", "created_at", "state", "rx_snr", "rx_rssi", "via_mqtt", "hops", "retry_count", "max_retries", "received_ack", "ack_error", "ack_timestamp", "ack_snr", "real_ack", "reply_id") SELECT "id", "owner_node_num", "message_id", "type", "channel_id", "from_node", "to_node", "message", "date", "created_at", "state", "rx_snr", "rx_rssi", "via_mqtt", "hops", "retry_count", "max_retries", "received_ack", "ack_error", "ack_timestamp", "ack_snr", "real_ack", "reply_id" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `messages_owner_idx` ON `messages` (`owner_node_num`);--> statement-breakpoint
CREATE INDEX `messages_owner_date_idx` ON `messages` (`owner_node_num`,`date`);--> statement-breakpoint
CREATE INDEX `messages_owner_type_idx` ON `messages` (`owner_node_num`,`type`);--> statement-breakpoint
CREATE INDEX `messages_direct_convo_idx` ON `messages` (`owner_node_num`,`type`,`from_node`,`to_node`,`date`);--> statement-breakpoint
CREATE INDEX `messages_channel_idx` ON `messages` (`owner_node_num`,`type`,`channel_id`,`date`);--> statement-breakpoint
CREATE INDEX `messages_state_idx` ON `messages` (`owner_node_num`,`state`);--> statement-breakpoint
CREATE UNIQUE INDEX `messages_owner_message_id_unique` ON `messages` (`owner_node_num`,`message_id`);--> statement-breakpoint
CREATE TABLE `__new_channels` (
	`owner_node_num` integer NOT NULL,
	`channel_index` integer NOT NULL,
	`role` integer NOT NULL,
	`name` text,
	`psk` text,
	`uplink_enabled` integer DEFAULT false,
	`downlink_enabled` integer DEFAULT false,
	`position_precision` integer DEFAULT 32,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`owner_node_num`, `channel_index`),
	FOREIGN KEY (`owner_node_num`) REFERENCES `devices`(`node_num`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_channels`("owner_node_num", "channel_index", "role", "name", "psk", "uplink_enabled", "downlink_enabled", "position_precision", "updated_at") SELECT "owner_node_num", "channel_index", "role", "name", "psk", "uplink_enabled", "downlink_enabled", "position_precision", "updated_at" FROM `channels`;--> statement-breakpoint
DROP TABLE `channels`;--> statement-breakpoint
ALTER TABLE `__new_channels` RENAME TO `channels`;--> statement-breakpoint
CREATE INDEX `channels_owner_idx` ON `channels` (`owner_node_num`);--> statement-breakpoint
CREATE TABLE `__new_config_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_node_num` integer NOT NULL,
	`change_type` text NOT NULL,
	`variant` text,
	`channel_index` integer,
	`field_path` text,
	`value` text NOT NULL,
	`original_value` text,
	`has_conflict` integer DEFAULT false NOT NULL,
	`remote_value` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_node_num`) REFERENCES `devices`(`node_num`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_config_changes`("id", "owner_node_num", "change_type", "variant", "channel_index", "field_path", "value", "original_value", "has_conflict", "remote_value", "created_at", "updated_at") SELECT "id", "owner_node_num", "change_type", "variant", "channel_index", "field_path", "value", "original_value", "has_conflict", "remote_value", "created_at", "updated_at" FROM `config_changes`;--> statement-breakpoint
DROP TABLE `config_changes`;--> statement-breakpoint
ALTER TABLE `__new_config_changes` RENAME TO `config_changes`;--> statement-breakpoint
CREATE INDEX `config_changes_owner_idx` ON `config_changes` (`owner_node_num`);--> statement-breakpoint
CREATE INDEX `config_changes_conflict_idx` ON `config_changes` (`owner_node_num`,`has_conflict`);--> statement-breakpoint
CREATE UNIQUE INDEX `config_changes_owner_unique` ON `config_changes` (`owner_node_num`,`change_type`,`variant`,`channel_index`,`field_path`);--> statement-breakpoint
CREATE TABLE `__new_device_configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_node_num` integer NOT NULL,
	`config` text NOT NULL,
	`module_config` text NOT NULL,
	`config_hash` text,
	`config_version` integer,
	`firmware_version` text,
	`last_synced_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_node_num`) REFERENCES `devices`(`node_num`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_device_configs`("id", "owner_node_num", "config", "module_config", "config_hash", "config_version", "firmware_version", "last_synced_at", "created_at", "updated_at") SELECT "id", "owner_node_num", "config", "module_config", "config_hash", "config_version", "firmware_version", "last_synced_at", "created_at", "updated_at" FROM `device_configs`;--> statement-breakpoint
DROP TABLE `device_configs`;--> statement-breakpoint
ALTER TABLE `__new_device_configs` RENAME TO `device_configs`;--> statement-breakpoint
CREATE INDEX `device_configs_owner_idx` ON `device_configs` (`owner_node_num`);--> statement-breakpoint
CREATE UNIQUE INDEX `device_configs_owner_unique` ON `device_configs` (`owner_node_num`);--> statement-breakpoint
CREATE TABLE `__new_last_read` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_node_num` integer NOT NULL,
	`type` text NOT NULL,
	`conversation_id` text NOT NULL,
	`message_id` integer NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_node_num`) REFERENCES `devices`(`node_num`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_last_read`("id", "owner_node_num", "type", "conversation_id", "message_id", "updated_at") SELECT "id", "owner_node_num", "type", "conversation_id", "message_id", "updated_at" FROM `last_read`;--> statement-breakpoint
DROP TABLE `last_read`;--> statement-breakpoint
ALTER TABLE `__new_last_read` RENAME TO `last_read`;--> statement-breakpoint
CREATE UNIQUE INDEX `last_read_owner_unique_idx` ON `last_read` (`owner_node_num`,`type`,`conversation_id`);--> statement-breakpoint
CREATE TABLE `__new_message_drafts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_node_num` integer NOT NULL,
	`type` text NOT NULL,
	`target_id` integer NOT NULL,
	`content` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_node_num`) REFERENCES `devices`(`node_num`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_message_drafts`("id", "owner_node_num", "type", "target_id", "content", "updated_at") SELECT "id", "owner_node_num", "type", "target_id", "content", "updated_at" FROM `message_drafts`;--> statement-breakpoint
DROP TABLE `message_drafts`;--> statement-breakpoint
ALTER TABLE `__new_message_drafts` RENAME TO `message_drafts`;--> statement-breakpoint
CREATE UNIQUE INDEX `message_drafts_owner_unique_idx` ON `message_drafts` (`owner_node_num`,`type`,`target_id`);--> statement-breakpoint
CREATE TABLE `__new_nodes` (
	`owner_node_num` integer NOT NULL,
	`node_num` integer NOT NULL,
	`last_heard` integer,
	`snr` real DEFAULT 0,
	`is_favorite` integer DEFAULT false NOT NULL,
	`is_ignored` integer DEFAULT false NOT NULL,
	`user_id` text,
	`long_name` text,
	`short_name` text,
	`macaddr` text,
	`hw_model` integer,
	`role` integer,
	`public_key` text,
	`is_licensed` integer DEFAULT false,
	`latitude_i` integer,
	`longitude_i` integer,
	`altitude` integer,
	`position_time` integer,
	`position_precision_bits` integer,
	`ground_speed` integer,
	`ground_track` integer,
	`sats_in_view` integer,
	`battery_level` integer,
	`voltage` real,
	`channel_utilization` real,
	`air_util_tx` real,
	`uptime_seconds` integer,
	`private_note` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`owner_node_num`, `node_num`),
	FOREIGN KEY (`owner_node_num`) REFERENCES `devices`(`node_num`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_nodes`("owner_node_num", "node_num", "last_heard", "snr", "is_favorite", "is_ignored", "user_id", "long_name", "short_name", "macaddr", "hw_model", "role", "public_key", "is_licensed", "latitude_i", "longitude_i", "altitude", "position_time", "position_precision_bits", "ground_speed", "ground_track", "sats_in_view", "battery_level", "voltage", "channel_utilization", "air_util_tx", "uptime_seconds", "private_note", "updated_at") SELECT "owner_node_num", "node_num", "last_heard", "snr", "is_favorite", "is_ignored", "user_id", "long_name", "short_name", "macaddr", "hw_model", "role", "public_key", "is_licensed", "latitude_i", "longitude_i", "altitude", "position_time", "position_precision_bits", "ground_speed", "ground_track", "sats_in_view", "battery_level", "voltage", "channel_utilization", "air_util_tx", "uptime_seconds", "private_note", "updated_at" FROM `nodes`;--> statement-breakpoint
DROP TABLE `nodes`;--> statement-breakpoint
ALTER TABLE `__new_nodes` RENAME TO `nodes`;--> statement-breakpoint
CREATE INDEX `nodes_owner_idx` ON `nodes` (`owner_node_num`);--> statement-breakpoint
CREATE INDEX `nodes_last_heard_idx` ON `nodes` (`owner_node_num`,`last_heard`);--> statement-breakpoint
CREATE INDEX `nodes_spatial_idx` ON `nodes` (`latitude_i`,`longitude_i`);--> statement-breakpoint
CREATE INDEX `nodes_favorite_idx` ON `nodes` (`owner_node_num`,`is_favorite`);--> statement-breakpoint
CREATE TABLE `__new_packet_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_node_num` integer NOT NULL,
	`from_node` integer NOT NULL,
	`to_node` integer,
	`channel` integer,
	`packet_id` integer,
	`hop_limit` integer,
	`hop_start` integer,
	`want_ack` integer,
	`rx_snr` real,
	`rx_rssi` real,
	`rx_time` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`raw_packet` text,
	FOREIGN KEY (`owner_node_num`) REFERENCES `devices`(`node_num`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_packet_logs`("id", "owner_node_num", "from_node", "to_node", "channel", "packet_id", "hop_limit", "hop_start", "want_ack", "rx_snr", "rx_rssi", "rx_time", "raw_packet") SELECT "id", "owner_node_num", "from_node", "to_node", "channel", "packet_id", "hop_limit", "hop_start", "want_ack", "rx_snr", "rx_rssi", "rx_time", "raw_packet" FROM `packet_logs`;--> statement-breakpoint
DROP TABLE `packet_logs`;--> statement-breakpoint
ALTER TABLE `__new_packet_logs` RENAME TO `packet_logs`;--> statement-breakpoint
CREATE INDEX `packet_logs_from_node_idx` ON `packet_logs` (`owner_node_num`,`from_node`,`rx_time`);--> statement-breakpoint
CREATE INDEX `packet_logs_owner_time_idx` ON `packet_logs` (`owner_node_num`,`rx_time`);--> statement-breakpoint
CREATE TABLE `__new_position_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_node_num` integer NOT NULL,
	`node_num` integer NOT NULL,
	`latitude_i` integer,
	`longitude_i` integer,
	`altitude` integer,
	`time` integer,
	`precision_bits` integer,
	`ground_speed` integer,
	`ground_track` integer,
	`sats_in_view` integer,
	`rx_time` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_node_num`) REFERENCES `devices`(`node_num`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_position_logs`("id", "owner_node_num", "node_num", "latitude_i", "longitude_i", "altitude", "time", "precision_bits", "ground_speed", "ground_track", "sats_in_view", "rx_time") SELECT "id", "owner_node_num", "node_num", "latitude_i", "longitude_i", "altitude", "time", "precision_bits", "ground_speed", "ground_track", "sats_in_view", "rx_time" FROM `position_logs`;--> statement-breakpoint
DROP TABLE `position_logs`;--> statement-breakpoint
ALTER TABLE `__new_position_logs` RENAME TO `position_logs`;--> statement-breakpoint
CREATE INDEX `position_logs_node_time_idx` ON `position_logs` (`owner_node_num`,`node_num`,`time`);--> statement-breakpoint
CREATE INDEX `position_logs_owner_time_idx` ON `position_logs` (`owner_node_num`,`time`);--> statement-breakpoint
CREATE INDEX `position_logs_spatial_idx` ON `position_logs` (`latitude_i`,`longitude_i`);--> statement-breakpoint
CREATE TABLE `__new_telemetry_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_node_num` integer NOT NULL,
	`node_num` integer NOT NULL,
	`battery_level` integer,
	`voltage` real,
	`channel_utilization` real,
	`air_util_tx` real,
	`uptime_seconds` integer,
	`temperature` real,
	`relative_humidity` real,
	`barometric_pressure` real,
	`current` real,
	`time` integer,
	`rx_time` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_node_num`) REFERENCES `devices`(`node_num`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_telemetry_logs`("id", "owner_node_num", "node_num", "battery_level", "voltage", "channel_utilization", "air_util_tx", "uptime_seconds", "temperature", "relative_humidity", "barometric_pressure", "current", "time", "rx_time") SELECT "id", "owner_node_num", "node_num", "battery_level", "voltage", "channel_utilization", "air_util_tx", "uptime_seconds", "temperature", "relative_humidity", "barometric_pressure", "current", "time", "rx_time" FROM `telemetry_logs`;--> statement-breakpoint
DROP TABLE `telemetry_logs`;--> statement-breakpoint
ALTER TABLE `__new_telemetry_logs` RENAME TO `telemetry_logs`;--> statement-breakpoint
CREATE INDEX `telemetry_logs_node_time_idx` ON `telemetry_logs` (`owner_node_num`,`node_num`,`time`);--> statement-breakpoint
CREATE INDEX `telemetry_logs_owner_time_idx` ON `telemetry_logs` (`owner_node_num`,`time`);--> statement-breakpoint
CREATE TABLE `__new_traceroute_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_node_num` integer NOT NULL,
	`target_node_num` integer NOT NULL,
	`route` text NOT NULL,
	`route_back` text,
	`snr_towards` text,
	`snr_back` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_node_num`) REFERENCES `devices`(`node_num`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_traceroute_logs`("id", "owner_node_num", "target_node_num", "route", "route_back", "snr_towards", "snr_back", "created_at") SELECT "id", "owner_node_num", "target_node_num", "route", "route_back", "snr_towards", "snr_back", "created_at" FROM `traceroute_logs`;--> statement-breakpoint
DROP TABLE `traceroute_logs`;--> statement-breakpoint
ALTER TABLE `__new_traceroute_logs` RENAME TO `traceroute_logs`;--> statement-breakpoint
CREATE INDEX `traceroute_logs_target_idx` ON `traceroute_logs` (`owner_node_num`,`target_node_num`,`created_at`);--> statement-breakpoint
CREATE INDEX `traceroute_logs_owner_time_idx` ON `traceroute_logs` (`owner_node_num`,`created_at`);--> statement-breakpoint
DROP VIEW `nodes_online`;