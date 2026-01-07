/**
 * React hook for managing pending config changes in the database.
 *
 * Pending changes are local edits that haven't been saved to the device yet.
 * This hook provides:
 * - Reactive access to pending changes
 * - Methods to save/clear changes
 * - Effective config by merging base + changes
 */

import type { Protobuf } from "@meshtastic/core";
import { configCacheRepo } from "@data/repositories/index.ts";
import { useCallback, useMemo } from "react";
import { useDrizzleQuery } from "./useDrizzleLive.ts";
import type { ConfigChange, DeviceConfig } from "../schema.ts";

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
  const { data: pendingChanges, status } = useDrizzleQuery<ConfigChange>(() => {
    if (!ownerNodeNum) {
      return configCacheRepo.buildChangesQuery(0);
    }
    return configCacheRepo.buildChangesQuery(ownerNodeNum);
  }, [ownerNodeNum]);

  const isLoading = status === "pending" && pendingChanges.length === 0;
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
  const getVariantChanges = useCallback(
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
  const hasVariantChanges = useCallback(
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
} {
  // Load base config
  const { data: configData, status: configStatus } =
    useDrizzleQuery<DeviceConfig>(() => {
      if (!ownerNodeNum) {
        return configCacheRepo.buildConfigQuery(0);
      }
      return configCacheRepo.buildConfigQuery(ownerNodeNum);
    }, [ownerNodeNum]);

  // Load pending changes
  const { pendingChanges, isLoading: changesLoading } =
    usePendingChanges(ownerNodeNum);

  // Compute effective config
  const result = useMemo(() => {
    const isLoading =
      (configStatus === "pending" && configData.length === 0) || changesLoading;
    const baseConfigRow = configData[0];

    if (!baseConfigRow) {
      return {
        config: null,
        baseConfig: null,
        isLoading,
        hasChanges: false,
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
    };
  }, [configData, configStatus, pendingChanges, changesLoading, configType]);

  return result;
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
} {
  // Load base config
  const { data: configData, status: configStatus } =
    useDrizzleQuery<DeviceConfig>(() => {
      if (!ownerNodeNum) {
        return configCacheRepo.buildConfigQuery(0);
      }
      return configCacheRepo.buildConfigQuery(ownerNodeNum);
    }, [ownerNodeNum]);

  // Load pending changes
  const { pendingChanges, isLoading: changesLoading } =
    usePendingChanges(ownerNodeNum);

  // Compute effective config
  const result = useMemo(() => {
    const isLoading =
      (configStatus === "pending" && configData.length === 0) || changesLoading;
    const baseConfigRow = configData[0];

    if (!baseConfigRow) {
      return {
        config: null,
        baseConfig: null,
        isLoading,
        hasChanges: false,
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
    };
  }, [
    configData,
    configStatus,
    pendingChanges,
    changesLoading,
    moduleConfigType,
  ]);

  return result;
}
