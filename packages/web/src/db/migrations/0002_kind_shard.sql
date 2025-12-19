CREATE TABLE `traceroute_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` integer NOT NULL,
	`target_node_num` integer NOT NULL,
	`route` text NOT NULL,
	`route_back` text,
	`snr_towards` text,
	`snr_back` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `traceroute_logs_target_idx` ON `traceroute_logs` (`device_id`,`target_node_num`,`created_at`);--> statement-breakpoint
CREATE INDEX `traceroute_logs_device_time_idx` ON `traceroute_logs` (`device_id`,`created_at`);