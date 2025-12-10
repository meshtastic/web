PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_channels` (
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
INSERT INTO `__new_channels`("device_id", "channel_index", "role", "name", "psk", "uplink_enabled", "downlink_enabled", "position_precision", "updated_at") SELECT "device_id", "channel_index", "role", "name", "psk", "uplink_enabled", "downlink_enabled", "position_precision", "updated_at" FROM `channels`;--> statement-breakpoint
DROP TABLE `channels`;--> statement-breakpoint
ALTER TABLE `__new_channels` RENAME TO `channels`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `channels_device_idx` ON `channels` (`device_id`);--> statement-breakpoint
DROP INDEX `last_read_unique_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `last_read_unique_idx` ON `last_read` (`device_id`,`type`,`conversation_id`);--> statement-breakpoint
DROP INDEX `message_drafts_unique_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `message_drafts_unique_idx` ON `message_drafts` (`device_id`,`type`,`target_id`);