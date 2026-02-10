/**
 * React hook for reading device config from the database.
 *
 * Provides reactive access to cached config data, enabling:
 * - Instant UI on reconnect (no wait for device packets)
 * - Offline config viewing
 * - Separation of concerns (read from DB, write via device connection)
 */

import { configCacheRepo } from "@data/repositories/index.ts";
import type { Protobuf } from "@meshtastic/core";
import { useMemo, useRef } from "react";
import type { DeviceConfig } from "../schema.ts";
import { useReactiveSQL } from "./useReactiveSQL.ts";

// =============================================================================
// Types
// =============================================================================

export interface CachedConfigData {
  config: Protobuf.LocalOnly.LocalConfig | null;
  moduleConfig: Protobuf.LocalOnly.LocalModuleConfig | null;
  configHash: string | null;
  configVersion: number | null;
  firmwareVersion: string | null;
  lastSyncedAt: Date | null;
}

export interface UseConfigResult {
  /** Full config object (all variants) */
  config: Protobuf.LocalOnly.LocalConfig | null;
  /** Full module config object (all variants) */
  moduleConfig: Protobuf.LocalOnly.LocalModuleConfig | null;
  /** Config hash (for change detection) */
  configHash: string | null;
  /** Config version from firmware */
  configVersion: number | null;
  /** Firmware version string */
  firmwareVersion: string | null;
  /** When config was last synced from device */
  lastSyncedAt: Date | null;
  /** Whether config is loaded from DB */
  isLoading: boolean;
  /** Whether config exists in DB */
  hasConfig: boolean;
  /** Error if query failed */
  error: Error | null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for reading cached device config from the database.
 *
 * @param ownerNodeNum - Device node number to read config for
 * @returns Config data, loading state, and error
 *
 * @example
 * ```tsx
 * const { config, moduleConfig, isLoading } = useConfig(myNodeNum);
 *
 * if (isLoading) return <Spinner />;
 *
 * const loraConfig = config?.lora;
 * ```
 */
export function useConfig(ownerNodeNum: number | undefined): UseConfigResult {
  // Build query for device config
  const query = useMemo(() => {
    if (!ownerNodeNum) {
      // Return a query that returns empty results
      return configCacheRepo.buildConfigQuery(0);
    }
    return configCacheRepo.buildConfigQuery(ownerNodeNum);
  }, [ownerNodeNum]);

  const { data, status, error } = useReactiveSQL<DeviceConfig>(
    configCacheRepo.getClient(),
    query,
  );

  // Track if we've ever received data to avoid showing loading on subsequent renders
  const hasHydratedRef = useRef(false);
  if (data.length > 0 || status === "ok") {
    hasHydratedRef.current = true;
  }

  // Parse the config data
  const result = useMemo((): UseConfigResult => {
    // Only show loading if we haven't hydrated yet AND query is pending with no data
    const isLoading =
      !hasHydratedRef.current && status === "pending" && data.length === 0;
    const row = data[0];

    if (!row) {
      return {
        config: null,
        moduleConfig: null,
        configHash: null,
        configVersion: null,
        firmwareVersion: null,
        lastSyncedAt: null,
        isLoading,
        hasConfig: false,
        error: error ?? null,
      };
    }

    // Parse JSON config objects
    // The schema stores these as JSON text, Drizzle should parse them automatically
    const config = row.config as Protobuf.LocalOnly.LocalConfig | null;
    const moduleConfig =
      row.moduleConfig as Protobuf.LocalOnly.LocalModuleConfig | null;

    return {
      config,
      moduleConfig,
      configHash: row.configHash,
      configVersion: row.configVersion,
      firmwareVersion: row.firmwareVersion,
      lastSyncedAt: row.lastSyncedAt ? new Date(row.lastSyncedAt) : null,
      isLoading,
      hasConfig: true,
      error: error ?? null,
    };
  }, [data, status, error]);

  return result;
}

// =============================================================================
// Helper hooks for specific config variants
// =============================================================================

/**
 * Hook for reading a specific config variant.
 *
 * @param ownerNodeNum - Device node number
 * @param variant - Config variant to read (e.g., "device", "lora")
 * @returns The specific config variant or null
 */
export function useConfigVariant<
  K extends keyof Protobuf.LocalOnly.LocalConfig,
>(
  ownerNodeNum: number | undefined,
  variant: K,
): Protobuf.LocalOnly.LocalConfig[K] | null {
  const { config } = useConfig(ownerNodeNum);
  return config?.[variant] ?? null;
}

/**
 * Hook for reading a specific module config variant.
 *
 * @param ownerNodeNum - Device node number
 * @param variant - Module config variant to read (e.g., "mqtt", "telemetry")
 * @returns The specific module config variant or null
 */
export function useModuleConfigVariant<
  K extends keyof Protobuf.LocalOnly.LocalModuleConfig,
>(
  ownerNodeNum: number | undefined,
  variant: K,
): Protobuf.LocalOnly.LocalModuleConfig[K] | null {
  const { moduleConfig } = useConfig(ownerNodeNum);
  return moduleConfig?.[variant] ?? null;
}
