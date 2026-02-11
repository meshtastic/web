-- Add auto_reconnect column to connections table (HTTP-only feature)
ALTER TABLE `connections` ADD COLUMN `auto_reconnect` integer NOT NULL DEFAULT 0;
