/**
 * React hook for managing pending config changes in the database.
 *
 * Pending changes are local edits that haven't been saved to the device yet.
 * This hook provides:
 * - Reactive access to pending changes
 * - Methods to save/clear changes
 * - Merging utilities for combining base config with pending changes
 */

import { pendingChangesRepo } from "@data/repositories/index.ts";
import { useCallback, useMemo, useRef } from "react";
import type { ConfigChange } from "../schema.ts";
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
      return pendingChangesRepo.buildChangesQuery(0);
    }
    return pendingChangesRepo.buildChangesQuery(ownerNodeNum);
  }, [ownerNodeNum]);

  const { data, status } = useReactiveSQL<ConfigChange>(
    pendingChangesRepo.getClient(),
    query,
  );
  const pendingChanges = useMemo(() => data ?? [], [data]);

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

      await pendingChangesRepo.saveLocalChange(ownerNodeNum, {
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

      await pendingChangesRepo.clearLocalChange(
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

    await pendingChangesRepo.clearAllLocalChanges(ownerNodeNum);
  }, [ownerNodeNum]);

  // Clear all changes for a specific variant
  const clearVariantChanges = useCallback(
    async (changeType: ChangeType, variant: string | null) => {
      if (!ownerNodeNum) return;

      await pendingChangesRepo.clearLocalChangesForVariant(
        ownerNodeNum,
        changeType,
        variant,
      );
    },
    [ownerNodeNum],
  );

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
