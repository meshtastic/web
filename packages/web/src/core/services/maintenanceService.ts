import logger from "../services/logger.ts";
import { nodeRepo, preferencesRepo } from "@db/index";

const getSettingsKey = (deviceId: number) =>
  `device:${deviceId}:maintenance:nodeCleanup`;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface NodeCleanupSettings {
  enabled: boolean;
  daysOld: number;
  unknownOnly: boolean;
  lastRun: number | null; // timestamp in ms
}

const defaultSettings: NodeCleanupSettings = {
  enabled: true,
  daysOld: 30,
  unknownOnly: false,
  lastRun: null,
};

export async function getNodeCleanupSettings(
  deviceId: number,
): Promise<NodeCleanupSettings> {
  const stored = await preferencesRepo.get<NodeCleanupSettings>(
    getSettingsKey(deviceId),
  );
  return { ...defaultSettings, ...stored };
}

export async function saveNodeCleanupSettings(
  deviceId: number,
  settings: NodeCleanupSettings,
): Promise<void> {
  await preferencesRepo.set(getSettingsKey(deviceId), settings);
}

export async function updateNodeCleanupSettings(
  deviceId: number,
  updates: Partial<NodeCleanupSettings>,
): Promise<NodeCleanupSettings> {
  const current = await getNodeCleanupSettings(deviceId);
  const updated: NodeCleanupSettings = {
    ...current,
    ...updates,
  };
  await saveNodeCleanupSettings(deviceId, updated);
  return updated;
}

/**
 * Check if weekly maintenance should run and execute if needed
 */
export async function runScheduledMaintenance(
  deviceId: number,
): Promise<{ ran: boolean; nodesDeleted: number }> {
  const settings = await getNodeCleanupSettings(deviceId);

  if (!settings.enabled) {
    return { ran: false, nodesDeleted: 0 };
  }

  const now = Date.now();
  const lastRun = settings.lastRun ?? 0;
  const timeSinceLastRun = now - lastRun;

  // Only run if it's been at least a week
  if (timeSinceLastRun < ONE_WEEK_MS) {
    const nextRun = new Date(lastRun + ONE_WEEK_MS);
    logger.debug(
      `[Maintenance] Skipping scheduled cleanup, next run: ${nextRun.toLocaleString()}`,
    );
    return { ran: false, nodesDeleted: 0 };
  }

  logger.debug("[Maintenance] Running scheduled node cleanup...");

  try {
    const deleted = await nodeRepo.deleteStaleNodes(
      deviceId,
      settings.daysOld,
      settings.unknownOnly,
    );

    // Update last run time
    await updateNodeCleanupSettings(deviceId, { lastRun: now });

    logger.debug(`[Maintenance] Deleted ${deleted} stale nodes`);
    return { ran: true, nodesDeleted: deleted };
  } catch (error) {
    logger.error("[Maintenance] Failed to run node cleanup:", error);
    return { ran: false, nodesDeleted: 0 };
  }
}

/**
 * Manually run node cleanup (ignores schedule, updates lastRun)
 */
export async function runNodeCleanup(
  deviceId: number,
  daysOld?: number,
  unknownOnly?: boolean,
): Promise<number> {
  const settings = await getNodeCleanupSettings(deviceId);
  const days = daysOld ?? settings.daysOld;
  const unknown = unknownOnly ?? settings.unknownOnly;

  const deleted = await nodeRepo.deleteStaleNodes(deviceId, days, unknown);

  // Update last run time
  await updateNodeCleanupSettings(deviceId, { lastRun: Date.now() });

  return deleted;
}

/**
 * Get time until next scheduled run
 */
export async function getNextScheduledRun(
  deviceId: number,
): Promise<Date | null> {
  const settings = await getNodeCleanupSettings(deviceId);

  if (!settings.enabled || !settings.lastRun) {
    return null;
  }

  return new Date(settings.lastRun + ONE_WEEK_MS);
}
