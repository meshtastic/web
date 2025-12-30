/**
 * Preferences hooks using useReactiveQuery for reactive updates
 */

import { eq } from "drizzle-orm";
import { useCallback, useMemo } from "react";
import { useReactiveQuery } from "sqlocal/react";
import { getClient, getDb } from "../client.ts";
import { preferencesRepo } from "../repositories/index.ts";
import { preferences } from "../schema.ts";

/**
 * Hook to get and set a single preference value
 * Now reactive using sqlocal
 */
export function usePreference<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => Promise<void>] {
  const query = useMemo(
    () =>
      getDb().select().from(preferences).where(eq(preferences.key, key)).limit(1),
    [key],
  );

  const { data } = useReactiveQuery(getClient(), query);

  const value = useMemo((): T => {
    const row = data?.[0];
    if (row) {
      try {
        return JSON.parse(row.value);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }, [data, defaultValue]);

  const setValue = useCallback(
    async (newValue: T): Promise<void> => {
      await preferencesRepo.set(key, newValue);
    },
    [key],
  );

  return [value, setValue];
}

/**
 * Hook to get all preferences as a Map
 * Now reactive using sqlocal
 */
export function useAllPreferences(): Map<string, unknown> {
  const query = useMemo(() => getDb().select().from(preferences), []);
  const { data } = useReactiveQuery(getClient(), query);

  return useMemo(() => {
    const map = new Map<string, unknown>();
    if (data) {
      for (const row of data) {
        try {
          map.set(row.key, JSON.parse(row.value));
        } catch {
          // Skip invalid JSON
        }
      }
    }
    return map;
  }, [data]);
}

/**
 * Hook specifically for panel sizes with persistence
 */
export function usePanelSizes(
  panelGroupId: string,
  defaultSizes: number[],
): [number[], (sizes: number[]) => Promise<void>] {
  const key = `panel-sizes:${panelGroupId}`;
  return usePreference<number[]>(key, defaultSizes);
}

/**
 * Deprecated: No longer needed with reactive queries
 */
export function invalidatePreferenceCache(_key: string): void {}

/**
 * Preference keys and their types
 */
export const PREFERENCE_KEYS = {
  THEME: "theme",
  COMPACT_MODE: "compactMode",
  SHOW_NODE_AVATARS: "showNodeAvatars",
  LANGUAGE: "language",
  TIME_FORMAT: "timeFormat",
  DISTANCE_UNITS: "distanceUnits",
  COORDINATE_FORMAT: "coordinateFormat",
  MAP_STYLE: "mapStyle",
  SHOW_NODE_LABELS: "showNodeLabels",
  SHOW_CONNECTION_LINES: "showConnectionLines",
  AUTO_CENTER_ON_POSITION: "autoCenterOnPosition",
  MASTER_VOLUME: "masterVolume",
  MESSAGE_SOUND_ENABLED: "messageSoundEnabled",
  ALERT_SOUND_ENABLED: "alertSoundEnabled",
  PACKET_BATCH_SIZE: "packetBatchSize",
  NODES_TABLE_COLUMN_VISIBILITY: "nodesTableColumnVisibility",
  NODES_TABLE_COLUMN_ORDER: "nodesTableColumnOrder",
  RASTER_SOURCES: "rasterSources",
} as const;

export type PreferenceKey =
  (typeof PREFERENCE_KEYS)[keyof typeof PREFERENCE_KEYS];