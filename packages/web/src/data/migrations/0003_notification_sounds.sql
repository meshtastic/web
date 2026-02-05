-- Notification sounds table for user-uploaded audio files
CREATE TABLE IF NOT EXISTS `notification_sounds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slot` text NOT NULL,
	`name` text NOT NULL,
	`mime_type` text NOT NULL,
	`data` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `notification_sounds_slot_unique` ON `notification_sounds` (`slot`);
