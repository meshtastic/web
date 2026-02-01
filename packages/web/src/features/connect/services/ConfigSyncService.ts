/**
 * ConfigSyncService - Handles config caching and hash computation
 *
 * Responsible for:
 * - Loading cached configs for fast reconnection
 * - Saving fresh configs to cache
 * - Computing and saving base hashes for change detection
 */

import logger from "@core/services/logger";
import { computeLeafHashes } from "@core/utils/merkleConfig";
import {
  channelRepo,
  configCacheRepo,
  configHashRepo,
  nodeRepo,
} from "@data/repositories";
import type { Protobuf } from "@meshtastic/core";

/** Device context needed for config sync operations */
export interface ConfigSyncContext {
  /** Device config object */
  config: Protobuf.LocalOnly.LocalConfig | null;
  /** Device module config object */
  moduleConfig: Protobuf.LocalOnly.LocalModuleConfig | null;
  /** Device metadata map */
  metadata: Map<number, { firmwareVersion?: string }>;
  /** Set cached config on device store */
  setCachedConfig: (
    config: Protobuf.LocalOnly.LocalConfig,
    moduleConfig: Protobuf.LocalOnly.LocalModuleConfig,
  ) => void;
}

// =============================================================================
// Cache Loading
// =============================================================================

/**
 * Try to load cached config for fast reconnection
 *
 * @param nodeNum - Device node number
 * @param device - Device context for setting cached config
 * @returns Object with usedCache flag and node count if cache was used
 */
export async function tryLoadCachedConfig(
  nodeNum: number,
  device: ConfigSyncContext,
): Promise<{ usedCache: boolean; nodeCount: number }> {
  try {
    const [cachedConfig, cachedNodes] = await Promise.all([
      configCacheRepo.getCachedConfig(nodeNum),
      nodeRepo.getNodes(nodeNum),
    ]);

    if (!cachedConfig || cachedNodes.length === 0) {
      return { usedCache: false, nodeCount: 0 };
    }

    logger.info(`[ConfigSyncService] Using cache: ${cachedNodes.length} nodes`);

    device.setCachedConfig(
      cachedConfig.config as Protobuf.LocalOnly.LocalConfig,
      cachedConfig.moduleConfig as Protobuf.LocalOnly.LocalModuleConfig,
    );

    return { usedCache: true, nodeCount: cachedNodes.length };
  } catch (err) {
    logger.warn("[ConfigSyncService] Cache check failed:", err);
    return { usedCache: false, nodeCount: 0 };
  }
}

// =============================================================================
// Cache Saving
// =============================================================================

/**
 * Save fresh config to cache
 *
 * @param nodeNum - Device node number
 * @param device - Device context with config to save
 */
export async function saveConfigToCache(
  nodeNum: number,
  device: ConfigSyncContext,
): Promise<void> {
  try {
    await configCacheRepo.saveCachedConfig(
      nodeNum,
      device.config as unknown as Record<string, unknown>,
      device.moduleConfig as unknown as Record<string, unknown>,
      { firmwareVersion: device.metadata.get(nodeNum)?.firmwareVersion },
    );
    logger.debug("[ConfigSyncService] Saved config to cache");
  } catch (err) {
    logger.warn("[ConfigSyncService] Failed to cache config:", err);
  }
}

// =============================================================================
// Hash Computation
// =============================================================================

/**
 * Compute and save base hashes for change detection
 *
 * These hashes form the baseline for detecting unsaved changes.
 *
 * @param nodeNum - Device node number
 * @param device - Device context with config for hashing
 */
export async function saveBaseHashes(
  nodeNum: number,
  device: ConfigSyncContext,
): Promise<void> {
  try {
    // Fetch channels and user data from DB (they were saved during config phase)
    const [dbChannels, myNode] = await Promise.all([
      channelRepo.getChannels(nodeNum),
      nodeRepo.getNode(nodeNum, nodeNum),
    ]);

    // Convert DB channels to array indexed by channel position
    const channels: unknown[] = [];
    for (const ch of dbChannels) {
      channels[ch.channelIndex] = {
        role: ch.role,
        name: ch.name,
        psk: ch.psk,
        uplinkEnabled: ch.uplinkEnabled,
        downlinkEnabled: ch.downlinkEnabled,
        positionPrecision: ch.positionPrecision,
      };
    }

    // Extract user fields that should be tracked for changes
    const user = myNode
      ? {
          shortName: myNode.shortName,
          longName: myNode.longName,
          role: myNode.role,
          isLicensed: myNode.isLicensed,
        }
      : undefined;

    const hashes = computeLeafHashes({
      config: device.config ?? undefined,
      moduleConfig: device.moduleConfig ?? undefined,
      channels,
      user,
    });

    await configHashRepo.saveBaseHashes(nodeNum, hashes);
    logger.debug(`[ConfigSyncService] Saved ${hashes.size} base config hashes`);
  } catch (err) {
    logger.warn("[ConfigSyncService] Failed to save base hashes:", err);
  }
}

/**
 * Save both config to cache and compute base hashes
 *
 * @param nodeNum - Device node number
 * @param device - Device context
 */
export async function saveFreshConfig(
  nodeNum: number,
  device: ConfigSyncContext,
): Promise<void> {
  await Promise.all([
    saveConfigToCache(nodeNum, device),
    saveBaseHashes(nodeNum, device),
  ]);
}
