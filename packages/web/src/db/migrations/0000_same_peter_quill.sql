CREATE TABLE `channels` (
	`device_id` integer NOT NULL,
	`channel_index` integer NOT NULL,
	`role` integer NOT NULL,
	`name` text,
	`psk` text,
	`uplink_enabled` integer DEFAULT false,
	`downlink_enabled` integer DEFAULT false,
	`position_precision` integer DEFAULT 32,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`device_id`, `channel_index`)
);
--> statement-breakpoint
CREATE INDEX `channels_device_idx` ON `channels` (`device_id`);--> statement-breakpoint
CREATE TABLE `connections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'disconnected' NOT NULL,
	`error` text,
	`mesh_device_id` integer,
	`url` text,
	`device_id` text,
	`device_name` text,
	`gatt_service_uuid` text,
	`usb_vendor_id` integer,
	`usb_product_id` integer,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_connected_at` integer,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `connections_default_idx` ON `connections` (`is_default`);--> statement-breakpoint
CREATE INDEX `connections_type_idx` ON `connections` (`type`);--> statement-breakpoint
CREATE TABLE `last_read` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` integer NOT NULL,
	`type` text NOT NULL,
	`conversation_id` text NOT NULL,
	`message_id` integer NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `last_read_unique_idx` ON `last_read` (`device_id`,`type`,`conversation_id`);--> statement-breakpoint
CREATE TABLE `message_drafts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` integer NOT NULL,
	`type` text NOT NULL,
	`target_id` integer NOT NULL,
	`content` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_drafts_unique_idx` ON `message_drafts` (`device_id`,`type`,`target_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` integer NOT NULL,
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
	`real_ack` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_device_idx` ON `messages` (`device_id`);--> statement-breakpoint
CREATE INDEX `messages_device_date_idx` ON `messages` (`device_id`,`date`);--> statement-breakpoint
CREATE INDEX `messages_device_type_idx` ON `messages` (`device_id`,`type`);--> statement-breakpoint
CREATE INDEX `messages_direct_convo_idx` ON `messages` (`device_id`,`type`,`from_node`,`to_node`,`date`);--> statement-breakpoint
CREATE INDEX `messages_broadcast_channel_idx` ON `messages` (`device_id`,`type`,`channel_id`,`date`);--> statement-breakpoint
CREATE INDEX `messages_state_idx` ON `messages` (`device_id`,`state`);--> statement-breakpoint
CREATE TABLE `nodes` (
	`device_id` integer NOT NULL,
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
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`device_id`, `node_num`)
);
--> statement-breakpoint
CREATE INDEX `nodes_device_idx` ON `nodes` (`device_id`);--> statement-breakpoint
CREATE INDEX `nodes_last_heard_idx` ON `nodes` (`device_id`,`last_heard`);--> statement-breakpoint
CREATE INDEX `nodes_spatial_idx` ON `nodes` (`latitude_i`,`longitude_i`);--> statement-breakpoint
CREATE INDEX `nodes_favorite_idx` ON `nodes` (`device_id`,`is_favorite`);--> statement-breakpoint
CREATE TABLE `packet_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` integer NOT NULL,
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
	`raw_packet` text
);
--> statement-breakpoint
CREATE INDEX `packet_logs_from_node_idx` ON `packet_logs` (`device_id`,`from_node`,`rx_time`);--> statement-breakpoint
CREATE INDEX `packet_logs_device_time_idx` ON `packet_logs` (`device_id`,`rx_time`);--> statement-breakpoint
CREATE TABLE `position_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` integer NOT NULL,
	`node_num` integer NOT NULL,
	`latitude_i` integer,
	`longitude_i` integer,
	`altitude` integer,
	`time` integer,
	`precision_bits` integer,
	`ground_speed` integer,
	`ground_track` integer,
	`sats_in_view` integer,
	`rx_time` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `position_logs_node_time_idx` ON `position_logs` (`device_id`,`node_num`,`time`);--> statement-breakpoint
CREATE INDEX `position_logs_device_time_idx` ON `position_logs` (`device_id`,`time`);--> statement-breakpoint
CREATE INDEX `position_logs_spatial_idx` ON `position_logs` (`latitude_i`,`longitude_i`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `telemetry_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` integer NOT NULL,
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
	`rx_time` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `telemetry_logs_node_time_idx` ON `telemetry_logs` (`device_id`,`node_num`,`time`);--> statement-breakpoint
CREATE INDEX `telemetry_logs_device_time_idx` ON `telemetry_logs` (`device_id`,`time`);