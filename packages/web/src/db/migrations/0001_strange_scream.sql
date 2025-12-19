DROP INDEX `messages_broadcast_channel_idx`;--> statement-breakpoint
CREATE INDEX `messages_channel_idx` ON `messages` (`device_id`,`type`,`channel_id`,`date`);--> statement-breakpoint
ALTER TABLE `nodes` ADD `private_note` text;