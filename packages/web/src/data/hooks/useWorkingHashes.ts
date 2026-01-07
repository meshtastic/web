/**
 * React hook for managing working config hashes.
 *
 * Working hashes represent the current config state including pending local changes.
 * They are computed by merging base config (from DB) with pending changes (from DB),
 * then hashing each config leaf.
 *
 * This enables efficient change detection without deep object comparison.
 */

import {
  type ComputeHashesInput,
  computeLeafHashes,
  getChangedLeaves,
  groupChangedLeaves,
  type LeafKey,
} from "@core/utils/merkleConfig.ts";
import {
  configCacheRepo,
  configHashRepo,
  workingHashRepo,
} from "@data/repositories/index.ts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDrizzleQuery } from "./useDrizzleLive.ts";
import { usePendingChanges } from "./usePendingChanges.ts";
import type { ConfigChange, ConfigHash, DeviceConfig } from "../schema.ts";

// =============================================================================
// Types
// =============================================================================

export interface UseWorkingHashesResult {
  /** Whether any config has changed from base */
  hasChanges: boolean;
  /** List of changed leaf keys */
  changedKeys: LeafKey[];
  /** Total count of changes */
  changedCount: number;

  /** Config variants that changed (e.g., ["device", "lora"]) */
  configChanges: string[];
  /** Module config variants that changed (e.g., ["mqtt"]) */
  moduleConfigChanges: string[];
  /** Channel indices that changed (e.g., [0, 2]) */
  channelChanges: number[];
  /** Whether user info changed */
  hasUserChange: boolean;

  /** Whether base hashes are loaded from DB */
  isBaseLoaded: boolean;
  /** Whether working hashes are being computed */
  isComputing: boolean;

  /** Base hashes (from device) */
  baseHashes: Map<string, string>;
  /** Working hashes (base + pending changes) */
  workingHashes: Map<string, string>;

  /** Force recompute working hashes now */
  recompute: () => void;
  /** Save current working hashes as new base (after successful device save) */
  snapshotAsBase: () => Promise<void>;
  /** Reset working to match base (discard local changes) */
  resetToBase: () => Promise<void>;
}

// =============================================================================
// Helper: Merge pending changes into base config
// =============================================================================

function mergeChangesIntoConfig(
  baseConfig: Record<string, unknown>,
  changes: ConfigChange[],
  changeType: "config" | "moduleConfig",
): Record<string, unknown> {
  const merged = { ...baseConfig };

  for (const change of changes) {
    if (change.changeType !== changeType) continue;
    if (!change.variant) continue;

    // Get or create the variant object
    const variantKey = change.variant;
    const existingVariant =
      (merged[variantKey] as Record<string, unknown>) ?? {};
    const mergedVariant = { ...existingVariant };

    if (change.fieldPath) {
      // Set the specific field
      mergedVariant[change.fieldPath] = change.value;
    } else {
      // Replace the entire variant (rare case)
      merged[variantKey] = change.value;
      continue;
    }

    merged[variantKey] = mergedVariant;
  }

  return merged;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing working config hashes with automatic debounced computation.
 *
 * @param ownerNodeNum - Device node number to track changes for
 * @param debounceMs - Debounce delay for hash computation and DB writes (default: 300)
 * @returns Working hash state and methods
 *
 * @example
 * ```tsx
 * const { hasChanges, changedKeys, configChanges } = useWorkingHashes(myNodeNum);
 *
 * if (hasChanges) {
 *   console.log("Changed configs:", configChanges);
 * }
 * ```
 */
export function useWorkingHashes(
  ownerNodeNum: number | undefined,
  debounceMs = 300,
): UseWorkingHashesResult {
  // ==========================================================================
  // State
  // ==========================================================================

  const [baseHashes, setBaseHashes] = useState<Map<string, string>>(new Map());
  const [workingHashes, setWorkingHashes] = useState<Map<string, string>>(
    new Map(),
  );
  const [isBaseLoaded, setIsBaseLoaded] = useState(false);
  const [isComputing, setIsComputing] = useState(false);

  // Refs for debouncing
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ==========================================================================
  // Load base hashes from database (reactive)
  // ==========================================================================

  const { data: storedBaseHashes, status: baseHashStatus } =
    useDrizzleQuery<ConfigHash>(() => {
      if (!ownerNodeNum) {
        return configHashRepo.buildHashesQuery(0);
      }
      return configHashRepo.buildHashesQuery(ownerNodeNum);
    }, [ownerNodeNum]);

  // Update base hashes when DB data changes
  useEffect(() => {
    if (baseHashStatus !== "ok" || !ownerNodeNum) return;

    const hashes = new Map<string, string>();
    for (const row of storedBaseHashes) {
      hashes.set(row.leafKey, row.hash);
    }

    setBaseHashes(hashes);
    setIsBaseLoaded(storedBaseHashes.length > 0);
  }, [storedBaseHashes, baseHashStatus, ownerNodeNum]);

  // ==========================================================================
  // Load base config from database (reactive)
  // ==========================================================================

  const { data: configData, status: configStatus } =
    useDrizzleQuery<DeviceConfig>(() => {
      if (!ownerNodeNum) {
        return configCacheRepo.buildConfigQuery(0);
      }
      return configCacheRepo.buildConfigQuery(ownerNodeNum);
    }, [ownerNodeNum]);

  // ==========================================================================
  // Load pending changes via usePendingChanges hook (avoids duplicate query)
  // ==========================================================================

  const { pendingChanges, isLoading: changesLoading } =
    usePendingChanges(ownerNodeNum);

  // ==========================================================================
  // Compute working hashes when config or changes update
  // ==========================================================================

  const computeAndSaveHashes = useCallback(async () => {
    if (!ownerNodeNum) return;
    if (configStatus !== "ok" || changesLoading) return;

    const baseConfigRow = configData[0];
    if (!baseConfigRow) return;

    setIsComputing(true);

    try {
      // Get base config
      const baseConfig =
        (baseConfigRow.config as Record<string, unknown>) ?? {};
      const baseModuleConfig =
        (baseConfigRow.moduleConfig as Record<string, unknown>) ?? {};

      // Merge pending changes
      const mergedConfig = mergeChangesIntoConfig(
        baseConfig,
        pendingChanges,
        "config",
      );
      const mergedModuleConfig = mergeChangesIntoConfig(
        baseModuleConfig,
        pendingChanges,
        "moduleConfig",
      );

      // Compute hashes for merged config
      const input: ComputeHashesInput = {
        config: mergedConfig as ComputeHashesInput["config"],
        moduleConfig: mergedModuleConfig as ComputeHashesInput["moduleConfig"],
        // TODO: Add channels and user when implemented
      };

      const hashes = computeLeafHashes(input);
      setWorkingHashes(hashes);

      // Persist to DB
      await workingHashRepo.saveWorkingHashes(ownerNodeNum, hashes);
    } finally {
      setIsComputing(false);
    }
  }, [ownerNodeNum, configData, configStatus, pendingChanges, changesLoading]);

  // Debounced recompute when dependencies change
  useEffect(() => {
    if (!ownerNodeNum) return;
    if (configStatus !== "ok" || changesLoading) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Schedule computation
    debounceTimerRef.current = setTimeout(() => {
      computeAndSaveHashes();
      debounceTimerRef.current = null;
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    ownerNodeNum,
    configData,
    configStatus,
    pendingChanges,
    changesLoading,
    debounceMs,
    computeAndSaveHashes,
  ]);

  // ==========================================================================
  // Public methods
  // ==========================================================================

  const recompute = useCallback(() => {
    // Flush any pending computation
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Compute immediately
    computeAndSaveHashes();
  }, [computeAndSaveHashes]);

  const snapshotAsBase = useCallback(async () => {
    if (!ownerNodeNum || workingHashes.size === 0) return;

    // Save working hashes as new base in DB
    await configHashRepo.saveBaseHashes(ownerNodeNum, workingHashes);

    // Update local state
    setBaseHashes(new Map(workingHashes));
  }, [ownerNodeNum, workingHashes]);

  const resetToBase = useCallback(async () => {
    if (!ownerNodeNum) return;

    // Clear all pending changes from DB
    await configCacheRepo.clearAllLocalChanges(ownerNodeNum);

    // Reset working hashes to base
    setWorkingHashes(new Map(baseHashes));

    // Save to DB
    await workingHashRepo.saveWorkingHashes(ownerNodeNum, baseHashes);
  }, [ownerNodeNum, baseHashes]);

  // ==========================================================================
  // Compute change summary
  // ==========================================================================

  const changeSummary = useMemo(() => {
    if (baseHashes.size === 0 || workingHashes.size === 0) {
      return {
        hasChanges: false,
        changedKeys: [] as LeafKey[],
        changedCount: 0,
        configChanges: [] as string[],
        moduleConfigChanges: [] as string[],
        channelChanges: [] as number[],
        hasUserChange: false,
      };
    }

    const changedKeys = getChangedLeaves(baseHashes, workingHashes);
    const grouped = groupChangedLeaves(changedKeys);

    return {
      hasChanges: changedKeys.length > 0,
      changedKeys,
      changedCount: changedKeys.length,
      ...grouped,
    };
  }, [baseHashes, workingHashes]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    ...changeSummary,
    isBaseLoaded,
    isComputing,
    baseHashes,
    workingHashes,
    recompute,
    snapshotAsBase,
    resetToBase,
  };
}

// =============================================================================
// Helper hook: Initialize base hashes from device config
// =============================================================================

/**
 * Hook to initialize base hashes when config is first received from device.
 * Should be called once after all config packets are received.
 *
 * @param ownerNodeNum - Device node number
 * @returns Function to snapshot current cached config as base hashes
 */
export function useInitializeBaseHashes(ownerNodeNum: number | undefined) {
  return useCallback(async () => {
    if (!ownerNodeNum) return;

    // Get cached config from DB
    const cachedConfig = await configCacheRepo.getCachedConfig(ownerNodeNum);
    if (!cachedConfig) return;

    // Compute hashes from cached config
    const input: ComputeHashesInput = {
      config: cachedConfig.config as ComputeHashesInput["config"],
      moduleConfig:
        cachedConfig.moduleConfig as ComputeHashesInput["moduleConfig"],
      // TODO: Add channels and user when implemented
    };

    const hashes = computeLeafHashes(input);

    // Save to database as base hashes
    await configHashRepo.saveBaseHashes(ownerNodeNum, hashes);

    // Also initialize working hashes to same values
    await workingHashRepo.saveWorkingHashes(ownerNodeNum, hashes);
  }, [ownerNodeNum]);
}
