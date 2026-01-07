-- Config hashes table for Merkle tree change detection
CREATE TABLE IF NOT EXISTS `config_hashes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_node_num` integer NOT NULL,
	`leaf_key` text NOT NULL,
	`hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_node_num`) REFERENCES `devices`(`node_num`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `config_hashes_owner_leaf_unique` ON `config_hashes` (`owner_node_num`,`leaf_key`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `config_hashes_owner_idx` ON `config_hashes` (`owner_node_num`);
