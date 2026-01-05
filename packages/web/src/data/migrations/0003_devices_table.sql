-- Create devices table (anchor for all device-scoped data)
CREATE TABLE IF NOT EXISTS `devices` (
  `node_num` integer PRIMARY KEY NOT NULL,
  `short_name` text,
  `long_name` text,
  `hw_model` integer,
  `first_seen` integer DEFAULT (unixepoch() * 1000) NOT NULL,
  `last_seen` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
-- Seed devices from existing nodes data
INSERT OR IGNORE INTO devices (node_num, first_seen, last_seen)
SELECT DISTINCT owner_node_num, (unixepoch() * 1000), (unixepoch() * 1000)
FROM nodes
WHERE owner_node_num IS NOT NULL AND owner_node_num != 0;
--> statement-breakpoint
-- Seed devices from messages data (in case there are messages without nodes)
INSERT OR IGNORE INTO devices (node_num, first_seen, last_seen)
SELECT DISTINCT owner_node_num, (unixepoch() * 1000), (unixepoch() * 1000)
FROM messages
WHERE owner_node_num IS NOT NULL AND owner_node_num != 0;
--> statement-breakpoint
-- Seed devices from channels data
INSERT OR IGNORE INTO devices (node_num, first_seen, last_seen)
SELECT DISTINCT owner_node_num, (unixepoch() * 1000), (unixepoch() * 1000)
FROM channels
WHERE owner_node_num IS NOT NULL AND owner_node_num != 0;
--> statement-breakpoint
-- Seed devices from device_configs data
INSERT OR IGNORE INTO devices (node_num, first_seen, last_seen)
SELECT DISTINCT owner_node_num, (unixepoch() * 1000), (unixepoch() * 1000)
FROM device_configs
WHERE owner_node_num IS NOT NULL AND owner_node_num != 0;
--> statement-breakpoint
-- Add node_num column to connections table (nullable, set after first connection)
ALTER TABLE connections ADD COLUMN node_num integer REFERENCES devices(node_num) ON DELETE CASCADE;
