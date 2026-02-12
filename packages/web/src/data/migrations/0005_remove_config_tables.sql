-- Migration: Remove config cache and hash tables
-- These tables are no longer needed as config is stored only in Zustand
-- Pending changes (configChanges) are kept for page refresh persistence

-- Drop config hash tables (Merkle tree system)
DROP TABLE IF EXISTS config_hashes;
DROP TABLE IF EXISTS working_hashes;

-- Drop config cache table (deviceConfigs)
-- Config is now stored only in Zustand, fetched fresh on each connect
DROP TABLE IF EXISTS device_configs;

-- Note: configChanges table is kept for pending changes persistence
