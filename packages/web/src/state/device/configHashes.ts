/**
 * Config hash state management utilities.
 *
 * Provides debounced hash computation and state management
 * for the Merkle tree config change tracking system.
 */

import {
  type ComputeHashesInput,
  computeLeafHashes,
  computeRootHash,
  createEmptyHashes,
  getChangedLeaves,
  groupChangedLeaves,
  hasAnyChanges,
  type LeafKey,
} from "@core/utils/merkleConfig.ts";

// =============================================================================
// Types
// =============================================================================

/**
 * State for config hash tracking in the device store.
 */
export interface ConfigHashState {
  /** Hashes computed from config received from device (the "truth") */
  baseHashes: Map<string, string>;
  /** Root hash of base config */
  baseRootHash: string;
  /** Hashes computed from current working state (form edits, etc.) */
  workingHashes: Map<string, string>;
  /** Root hash of working state */
  workingRootHash: string;
  /** Timestamp of last hash computation */
  lastComputedAt: number;
}

/**
 * Result of comparing base and working hashes.
 */
export interface ConfigChangeSummary {
  /** Whether any changes exist */
  hasChanges: boolean;
  /** List of changed leaf keys */
  changedKeys: LeafKey[];
  /** Count of total changes */
  changedCount: number;
  /** Config variants that changed (e.g., ["device", "lora"]) */
  configChanges: string[];
  /** Module config variants that changed (e.g., ["mqtt"]) */
  moduleConfigChanges: string[];
  /** Channel indices that changed (e.g., [0, 2]) */
  channelChanges: number[];
  /** Whether user info changed */
  hasUserChange: boolean;
}

// =============================================================================
// State Factory
// =============================================================================

/**
 * Create initial hash state with empty hashes.
 * Working hashes start equal to base hashes (no changes).
 */
export function createInitialHashState(): ConfigHashState {
  const emptyHashes = createEmptyHashes();
  const emptyRoot = computeRootHash(emptyHashes);

  return {
    baseHashes: emptyHashes,
    baseRootHash: emptyRoot,
    workingHashes: new Map(emptyHashes), // Clone
    workingRootHash: emptyRoot,
    lastComputedAt: 0,
  };
}

/**
 * Create hash state from existing base hashes.
 * Working hashes start equal to base hashes (no changes).
 */
export function createHashStateFromBase(
  baseHashes: Map<string, string>,
): ConfigHashState {
  const baseRoot = computeRootHash(baseHashes);

  return {
    baseHashes,
    baseRootHash: baseRoot,
    workingHashes: new Map(baseHashes), // Clone - no changes initially
    workingRootHash: baseRoot,
    lastComputedAt: Date.now(),
  };
}

// =============================================================================
// Change Detection
// =============================================================================

/**
 * Get a summary of config changes between base and working state.
 */
export function getChangeSummary(state: ConfigHashState): ConfigChangeSummary {
  const changedKeys = getChangedLeaves(state.baseHashes, state.workingHashes);
  const grouped = groupChangedLeaves(changedKeys);

  return {
    hasChanges: changedKeys.length > 0,
    changedKeys,
    changedCount: changedKeys.length,
    ...grouped,
  };
}

/**
 * Quick check if any changes exist (compares root hashes).
 */
export function hasChanges(state: ConfigHashState): boolean {
  return state.baseRootHash !== state.workingRootHash;
}

// =============================================================================
// Debounced Hash Computer
// =============================================================================

export interface HashComputer {
  /** Trigger hash computation (debounced) */
  compute: (input: ComputeHashesInput) => void;
  /** Force immediate computation, bypassing debounce */
  flush: () => void;
  /** Cancel any pending computation */
  cancel: () => void;
  /** Check if computation is pending */
  isPending: () => boolean;
}

/**
 * Create a debounced hash computer.
 *
 * Batches rapid config changes and computes hashes after the debounce period.
 * Useful for form inputs where values change frequently.
 *
 * @param onComputed - Callback when hashes are computed
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 * @returns Hash computer with compute, flush, and cancel methods
 */
export function createHashComputer(
  onComputed: (hashes: Map<string, string>, rootHash: string) => void,
  debounceMs = 300,
): HashComputer {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingInput: ComputeHashesInput | null = null;

  const doCompute = () => {
    if (!pendingInput) return;

    const hashes = computeLeafHashes(pendingInput);
    const root = computeRootHash(hashes);

    onComputed(hashes, root);

    pendingInput = null;
    timeoutId = null;
  };

  return {
    compute: (input: ComputeHashesInput) => {
      pendingInput = input;

      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Schedule new computation
      timeoutId = setTimeout(doCompute, debounceMs);
    },

    flush: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      doCompute();
    },

    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      pendingInput = null;
    },

    isPending: () => timeoutId !== null,
  };
}

// =============================================================================
// Hash State Updates
// =============================================================================

/**
 * Update working hashes in state.
 */
export function updateWorkingHashes(
  state: ConfigHashState,
  hashes: Map<string, string>,
  rootHash: string,
): ConfigHashState {
  return {
    ...state,
    workingHashes: hashes,
    workingRootHash: rootHash,
    lastComputedAt: Date.now(),
  };
}

/**
 * Snapshot current working state as new base (after successful save to device).
 */
export function snapshotWorkingAsBase(state: ConfigHashState): ConfigHashState {
  return {
    ...state,
    baseHashes: new Map(state.workingHashes),
    baseRootHash: state.workingRootHash,
  };
}

/**
 * Reset working hashes to match base (discard changes).
 */
export function resetWorkingToBase(state: ConfigHashState): ConfigHashState {
  return {
    ...state,
    workingHashes: new Map(state.baseHashes),
    workingRootHash: state.baseRootHash,
    lastComputedAt: Date.now(),
  };
}

/**
 * Update base hashes from device (on config received).
 * Also updates working to match if no local changes exist.
 *
 * @param state - Current state
 * @param hashes - New base hashes from device
 * @param preserveWorkingChanges - If true, keep working changes; if false, reset working to base
 */
export function updateBaseHashes(
  state: ConfigHashState,
  hashes: Map<string, string>,
  preserveWorkingChanges = false,
): ConfigHashState {
  const newBaseRoot = computeRootHash(hashes);

  if (
    preserveWorkingChanges &&
    hasAnyChanges(state.baseHashes, state.workingHashes)
  ) {
    // Keep existing working changes
    return {
      ...state,
      baseHashes: hashes,
      baseRootHash: newBaseRoot,
    };
  }

  // No existing changes, sync working to new base
  return {
    baseHashes: hashes,
    baseRootHash: newBaseRoot,
    workingHashes: new Map(hashes),
    workingRootHash: newBaseRoot,
    lastComputedAt: Date.now(),
  };
}

// =============================================================================
// Serialization (for persistence)
// =============================================================================

/**
 * Serialize hash map to array for storage.
 */
export function serializeHashes(
  hashes: Map<string, string>,
): Array<{ leafKey: string; hash: string }> {
  return Array.from(hashes.entries()).map(([leafKey, hash]) => ({
    leafKey,
    hash,
  }));
}

/**
 * Deserialize hash array to map.
 */
export function deserializeHashes(
  entries: Array<{ leafKey: string; hash: string }>,
): Map<string, string> {
  return new Map(entries.map((e) => [e.leafKey, e.hash]));
}
