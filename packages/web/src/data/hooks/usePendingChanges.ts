/**
 * React hook for managing pending config changes in the database.
 *
 * Pending changes are local edits that haven't been saved to the device yet.
 * This hook provides:
 * - Reactive access to pending changes
 * - Methods to save/clear changes
 * - Effective config by merging base + changes
 */

import { create } from "@bufbuild/protobuf";
import { configCacheRepo } from "@data/repositories/index.ts";
import type {
  ValidConfigType,
  ValidModuleConfigType,
} from "@features/settings/components/types.ts";
import { Protobuf } from "@meshtastic/core";
import { useCallback, useMemo, useRef } from "react";
import type { ConfigChange, DeviceConfig } from "../schema.ts";
import { useReactiveSQL } from "./useReactiveSQL.ts";

// =============================================================================
// Types
// =============================================================================

type ChangeType = "config" | "moduleConfig" | "channel" | "user";

export interface UsePendingChangesResult {
  /** All pending changes for this device */
  pendingChanges: ConfigChange[];
  /** Whether changes are loading */
  isLoading: boolean;
  /** Whether there are any pending changes */
  hasChanges: boolean;
  /** Count of pending changes */
  changeCount: number;

  /** Save a single field change */
  saveChange: (params: {
    changeType: ChangeType;
    variant?: string;
    channelIndex?: number;
    fieldPath?: string;
    value: unknown;
    originalValue?: unknown;
  }) => Promise<void>;

  /** Clear a single field change */
  clearChange: (params: {
    changeType: ChangeType;
    variant?: string | null;
    channelIndex?: number | null;
    fieldPath?: string | null;
  }) => Promise<void>;

  /** Clear all pending changes for this device */
  clearAllChanges: () => Promise<void>;

  /** Clear all changes for a specific config variant */
  clearVariantChanges: (
    changeType: ChangeType,
    variant: string | null,
  ) => Promise<void>;

  /** Get changes for a specific variant */
  getVariantChanges: (
    changeType: ChangeType,
    variant: string | null,
  ) => ConfigChange[];

  /** Check if a specific variant has changes */
  hasVariantChanges: (
    changeType: ChangeType,
    variant: string | null,
  ) => boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing pending config changes.
 *
 * @param ownerNodeNum - Device node number to track changes for
 * @returns Pending changes state and methods
 */
export function usePendingChanges(
  ownerNodeNum: number | undefined,
): UsePendingChangesResult {
  // Load pending changes from database (reactive)
  const query = useMemo(() => {
    if (!ownerNodeNum) {
      return configCacheRepo.buildChangesQuery(0);
    }
    return configCacheRepo.buildChangesQuery(ownerNodeNum);
  }, [ownerNodeNum]);

  const { data, status } = useReactiveSQL<ConfigChange>(
    configCacheRepo.getClient(),
    query,
  );
  const pendingChanges = data ?? [];

  // Track if we've ever received data to avoid showing loading on subsequent renders
  const hasHydratedRef = useRef(false);
  if (pendingChanges.length > 0 || status === "ok") {
    hasHydratedRef.current = true;
  }

  // Only show loading if we haven't hydrated yet AND query is pending with no data
  const isLoading =
    !hasHydratedRef.current &&
    status === "pending" &&
    pendingChanges.length === 0;
  const hasChanges = pendingChanges.length > 0;
  const changeCount = pendingChanges.length;

  // Save a single change
  const saveChange = useCallback(
    async (params: {
      changeType: ChangeType;
      variant?: string;
      channelIndex?: number;
      fieldPath?: string;
      value: unknown;
      originalValue?: unknown;
    }) => {
      if (!ownerNodeNum) return;

      await configCacheRepo.saveLocalChange(ownerNodeNum, {
        changeType: params.changeType,
        variant: params.variant,
        channelIndex: params.channelIndex,
        fieldPath: params.fieldPath,
        value: params.value,
        originalValue: params.originalValue,
      });
    },
    [ownerNodeNum],
  );

  // Clear a single change
  const clearChange = useCallback(
    async (params: {
      changeType: ChangeType;
      variant?: string | null;
      channelIndex?: number | null;
      fieldPath?: string | null;
    }) => {
      if (!ownerNodeNum) return;

      await configCacheRepo.clearLocalChange(
        ownerNodeNum,
        params.changeType,
        params.variant ?? null,
        params.channelIndex ?? null,
        params.fieldPath ?? null,
      );
    },
    [ownerNodeNum],
  );

  // Clear all changes for this device
  const clearAllChanges = useCallback(async () => {
    if (!ownerNodeNum) return;
    await configCacheRepo.clearAllLocalChanges(ownerNodeNum);
  }, [ownerNodeNum]);

  // Clear all changes for a specific variant
  const clearVariantChanges = useCallback(
    async (changeType: ChangeType, variant: string | null) => {
      if (!ownerNodeNum) return;
      await configCacheRepo.clearLocalChangesForVariant(
        ownerNodeNum,
        changeType,
        variant,
      );
    },
    [ownerNodeNum],
  );

  // Get changes for a specific variant
  const getVariantChanges = useMemo(
    () =>
      (changeType: ChangeType, variant: string | null): ConfigChange[] => {
        return pendingChanges.filter(
          (c) =>
            c.changeType === changeType &&
            (variant === null ? c.variant === null : c.variant === variant),
        );
      },
    [pendingChanges],
  );

  // Check if a specific variant has changes
  const hasVariantChanges = useMemo(
    () =>
      (changeType: ChangeType, variant: string | null): boolean => {
        return pendingChanges.some(
          (c) =>
            c.changeType === changeType &&
            (variant === null ? c.variant === null : c.variant === variant),
        );
      },
    [pendingChanges],
  );

  return {
    pendingChanges,
    isLoading,
    hasChanges,
    changeCount,
    saveChange,
    clearChange,
    clearAllChanges,
    clearVariantChanges,
    getVariantChanges,
    hasVariantChanges,
  };
}

// =============================================================================
// Helper: Merge pending changes into base config
// =============================================================================

/**
 * Merge pending field-level changes into a base config object.
 *
 * @param baseConfig - Base config object from device
 * @param changes - Pending changes to apply
 * @returns Merged config with changes applied
 */
export function mergeConfigChanges<T extends Record<string, unknown>>(
  baseConfig: T | undefined | null,
  changes: ConfigChange[],
): T | undefined {
  if (!baseConfig) return undefined;

  const merged = { ...baseConfig } as Record<string, unknown>;

  for (const change of changes) {
    if (change.fieldPath) {
      // Simple field path (no nested paths for now)
      merged[change.fieldPath] = change.value;
    }
  }

  return merged as T;
}

// =============================================================================
// Hook: Effective config with changes merged
// =============================================================================

/**
 * Hook for getting effective config with pending changes merged.
 *
 * @param ownerNodeNum - Device node number
 * @param configType - Config variant (e.g., "device", "lora")
 * @returns Effective config with pending changes applied
 */
export function useEffectiveConfig<
  K extends keyof Protobuf.LocalOnly.LocalConfig,
>(
  ownerNodeNum: number | undefined,
  configType: K,
): {
  config: Protobuf.LocalOnly.LocalConfig[K] | null;
  baseConfig: Protobuf.LocalOnly.LocalConfig[K] | null;
  isLoading: boolean;
  hasChanges: boolean;
  error: Error | null;
} {
  // Load base config
  const configQuery = useMemo(() => {
    if (!ownerNodeNum) {
      return configCacheRepo.buildConfigQuery(0);
    }
    return configCacheRepo.buildConfigQuery(ownerNodeNum);
  }, [ownerNodeNum]);

  const {
    data: configData,
    status: configStatus,
    error: configError,
  } = useReactiveSQL<DeviceConfig>(configCacheRepo.getClient(), configQuery);

  // Track if we've ever received data to avoid showing loading on subsequent renders
  const configHydratedRef = useRef(false);
  const configDataArray = configData ?? [];
  if (configDataArray.length > 0 || configStatus === "ok") {
    configHydratedRef.current = true;
  }

  // Load pending changes
  const { pendingChanges, isLoading: changesLoading } =
    usePendingChanges(ownerNodeNum);

  // Compute effective config
  const result = useMemo(() => {
    // Only show loading if we haven't hydrated yet AND query is pending with no data
    const isLoading =
      (!configHydratedRef.current &&
        configStatus === "pending" &&
        configDataArray.length === 0) ||
      changesLoading;
    const baseConfigRow = configDataArray[0];

    if (!baseConfigRow) {
      return {
        config: null,
        baseConfig: null,
        isLoading,
        hasChanges: false,
        error: configError ?? null,
      };
    }

    const fullConfig =
      baseConfigRow.config as Protobuf.LocalOnly.LocalConfig | null;
    const baseConfig = fullConfig?.[configType] ?? null;

    // Filter changes for this config type
    const variantChanges = pendingChanges.filter(
      (c) => c.changeType === "config" && c.variant === configType,
    );

    const hasChanges = variantChanges.length > 0;

    // Merge changes into base config
    const effectiveConfig = mergeConfigChanges(
      baseConfig as Record<string, unknown> | null,
      variantChanges,
    );

    return {
      config: (effectiveConfig as Protobuf.LocalOnly.LocalConfig[K]) ?? null,
      baseConfig,
      isLoading,
      hasChanges,
      error: configError ?? null,
    };
  }, [
    configDataArray,
    configStatus,
    configError,
    pendingChanges,
    changesLoading,
    configType,
  ]);

  return result;
}

// =============================================================================
// Protobuf Conversion Utilities
// =============================================================================

/**
 * Convert database config changes to protobuf Config objects for device.setConfig()
 *
 * Groups field-level changes by variant and creates protobuf objects with merged values.
 *
 * @param pendingChanges - All pending changes from database
 * @param baseConfig - Base config from database to merge changes into
 * @returns Array of Protobuf.Config.Config objects ready for device.setConfig()
 */
export function buildConfigProtobuf(
  pendingChanges: ConfigChange[],
  baseConfig: Protobuf.LocalOnly.LocalConfig | null,
): Protobuf.Config.Config[] {
  if (!baseConfig) return [];

  // Group changes by variant
  const changesByVariant = new Map<string, ConfigChange[]>();
  for (const change of pendingChanges) {
    if (change.changeType === "config" && change.variant) {
      const existing = changesByVariant.get(change.variant) ?? [];
      existing.push(change);
      changesByVariant.set(change.variant, existing);
    }
  }

  const configs: Protobuf.Config.Config[] = [];

  for (const [variant, changes] of changesByVariant) {
    // Get base config for this variant
    const variantBase = baseConfig[variant as ValidConfigType];
    if (!variantBase) continue;

    // Merge changes into base
    const merged = { ...variantBase } as Record<string, unknown>;
    for (const change of changes) {
      if (change.fieldPath) {
        merged[change.fieldPath] = change.value;
      }
    }

    // Create protobuf object
    configs.push(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: variant as ValidConfigType,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic config value from change tracking
          value: merged as never,
        },
      }),
    );
  }

  return configs;
}

/**
 * Convert database module config changes to protobuf ModuleConfig objects
 *
 * @param pendingChanges - All pending changes from database
 * @param baseModuleConfig - Base module config from database
 * @returns Array of Protobuf.ModuleConfig.ModuleConfig objects
 */
export function buildModuleConfigProtobuf(
  pendingChanges: ConfigChange[],
  baseModuleConfig: Protobuf.LocalOnly.LocalModuleConfig | null,
): Protobuf.ModuleConfig.ModuleConfig[] {
  if (!baseModuleConfig) return [];

  // Group changes by variant
  const changesByVariant = new Map<string, ConfigChange[]>();
  for (const change of pendingChanges) {
    if (change.changeType === "moduleConfig" && change.variant) {
      const existing = changesByVariant.get(change.variant) ?? [];
      existing.push(change);
      changesByVariant.set(change.variant, existing);
    }
  }

  const configs: Protobuf.ModuleConfig.ModuleConfig[] = [];

  for (const [variant, changes] of changesByVariant) {
    // Get base config for this variant
    const variantBase = baseModuleConfig[variant as ValidModuleConfigType];
    if (!variantBase) continue;

    // Merge changes into base
    const merged = { ...variantBase } as Record<string, unknown>;
    for (const change of changes) {
      if (change.fieldPath) {
        merged[change.fieldPath] = change.value;
      }
    }

    // Create protobuf object
    configs.push(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: variant as ValidModuleConfigType,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic config value from change tracking
          value: merged as never,
        },
      }),
    );
  }

  return configs;
}

/**
 * Convert database channel changes to protobuf Channel objects
 *
 * @param pendingChanges - All pending changes from database
 * @returns Array of Protobuf.Channel.Channel objects
 */
export function buildChannelProtobuf(
  pendingChanges: ConfigChange[],
): Protobuf.Channel.Channel[] {
  const channels: Protobuf.Channel.Channel[] = [];

  for (const change of pendingChanges) {
    if (change.changeType === "channel" && change.value) {
      channels.push(change.value as Protobuf.Channel.Channel);
    }
  }

  return channels;
}

/**
 * Hook for getting effective module config with pending changes merged.
 *
 * @param ownerNodeNum - Device node number
 * @param moduleConfigType - Module config variant (e.g., "mqtt", "telemetry")
 * @returns Effective module config with pending changes applied
 */
export function useEffectiveModuleConfig<
  K extends keyof Protobuf.LocalOnly.LocalModuleConfig,
>(
  ownerNodeNum: number | undefined,
  moduleConfigType: K,
): {
  config: Protobuf.LocalOnly.LocalModuleConfig[K] | null;
  baseConfig: Protobuf.LocalOnly.LocalModuleConfig[K] | null;
  isLoading: boolean;
  hasChanges: boolean;
  error: Error | null;
} {
  // Load base config
  const moduleConfigQuery = useMemo(() => {
    if (!ownerNodeNum) {
      return configCacheRepo.buildConfigQuery(0);
    }
    return configCacheRepo.buildConfigQuery(ownerNodeNum);
  }, [ownerNodeNum]);

  const {
    data: configData,
    status: configStatus,
    error: configError,
  } = useReactiveSQL<DeviceConfig>(
    configCacheRepo.getClient(),
    moduleConfigQuery,
  );

  // Track if we've ever received data to avoid showing loading on subsequent renders
  const moduleConfigHydratedRef = useRef(false);
  const moduleConfigDataArray = configData ?? [];
  if (moduleConfigDataArray.length > 0 || configStatus === "ok") {
    moduleConfigHydratedRef.current = true;
  }

  // Load pending changes
  const { pendingChanges, isLoading: changesLoading } =
    usePendingChanges(ownerNodeNum);

  // Compute effective config
  const result = useMemo(() => {
    // Only show loading if we haven't hydrated yet AND query is pending with no data
    const isLoading =
      (!moduleConfigHydratedRef.current &&
        configStatus === "pending" &&
        moduleConfigDataArray.length === 0) ||
      changesLoading;
    const baseConfigRow = moduleConfigDataArray[0];

    if (!baseConfigRow) {
      return {
        config: null,
        baseConfig: null,
        isLoading,
        hasChanges: false,
        error: configError ?? null,
      };
    }

    const fullModuleConfig =
      baseConfigRow.moduleConfig as Protobuf.LocalOnly.LocalModuleConfig | null;
    const baseConfig = fullModuleConfig?.[moduleConfigType] ?? null;

    // Filter changes for this module config type
    const variantChanges = pendingChanges.filter(
      (c) => c.changeType === "moduleConfig" && c.variant === moduleConfigType,
    );

    const hasChanges = variantChanges.length > 0;

    // Merge changes into base config
    const effectiveConfig = mergeConfigChanges(
      baseConfig as Record<string, unknown> | null,
      variantChanges,
    );

    return {
      config:
        (effectiveConfig as Protobuf.LocalOnly.LocalModuleConfig[K]) ?? null,
      baseConfig,
      isLoading,
      hasChanges,
      error: configError ?? null,
    };
  }, [
    moduleConfigDataArray,
    configStatus,
    configError,
    pendingChanges,
    changesLoading,
    moduleConfigType,
  ]);

  return result;
}
