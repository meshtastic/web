/**
 * React hooks for reading device config from the Zustand store.
 *
 * These hooks provide reactive access to config data directly from the device store.
 * Config is received fresh from the device on each connection - no database caching.
 */

import type { Protobuf } from "@meshtastic/core";
import { useDevice } from "@state/index.ts";

// =============================================================================
// Types
// =============================================================================

export interface UseConfigResult {
  /** Full config object (all variants) */
  config: Protobuf.LocalOnly.LocalConfig | null;
  /** Full module config object (all variants) */
  moduleConfig: Protobuf.LocalOnly.LocalModuleConfig | null;
  /** Whether config data has been received from device */
  isLoading: boolean;
  /** Whether config exists (has been received) */
  hasConfig: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for reading device config from the Zustand store.
 *
 * @returns Config data and loading state
 *
 * @example
 * ```tsx
 * const { config, moduleConfig, isLoading } = useConfig();
 *
 * if (isLoading) return <Spinner />;
 *
 * const loraConfig = config?.lora;
 * ```
 */
export function useConfig(): UseConfigResult {
  const device = useDevice();

  const config = device?.config ?? null;
  const moduleConfig = device?.moduleConfig ?? null;

  // Config is loading if we don't have the device config yet
  // (it's created with protobuf defaults but not yet populated from device)
  const receivedConfigs = device?.configProgress?.receivedConfigs;
  const hasConfig =
    receivedConfigs?.has("config:device") ||
    receivedConfigs?.has("config:lora") ||
    false;
  const isLoading = !hasConfig;

  return {
    config,
    moduleConfig,
    isLoading,
    hasConfig,
  };
}

// =============================================================================
// Helper hooks for specific config variants
// =============================================================================

/**
 * Hook for reading a specific config variant.
 *
 * @param variant - Config variant to read (e.g., "device", "lora")
 * @returns The specific config variant or null
 */
export function useConfigVariant<
  K extends keyof Protobuf.LocalOnly.LocalConfig,
>(variant: K): Protobuf.LocalOnly.LocalConfig[K] | null {
  const device = useDevice();
  return device?.config?.[variant] ?? null;
}

/**
 * Hook for reading a specific module config variant.
 *
 * @param variant - Module config variant to read (e.g., "mqtt", "telemetry")
 * @returns The specific module config variant or null
 */
export function useModuleConfigVariant<
  K extends keyof Protobuf.LocalOnly.LocalModuleConfig,
>(variant: K): Protobuf.LocalOnly.LocalModuleConfig[K] | null {
  const device = useDevice();
  return device?.moduleConfig?.[variant] ?? null;
}
