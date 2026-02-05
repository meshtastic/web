/**
 * Preferences hooks for managing user preferences
 */

import { toast } from "@shared/hooks/useToast";
import { useCallback, useMemo } from "react";
import { useReactiveQuery } from "sqlocal/react";
import { preferencesRepo } from "../repositories/index.ts";

interface UsePreferenceOptions {
  notify?: boolean;
}

/**
 * Hook to get and set a single preference value
 */
export function usePreference<T>(
  key: string,
  defaultValue: T,
  options?: UsePreferenceOptions,
): [T, (value: T) => Promise<void>] {
  const query = useMemo(() => preferencesRepo.buildPreferenceQuery(key), [key]);

  const { data } = useReactiveQuery(preferencesRepo.getClient(), query);

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
      if (options?.notify) {
        toast({ title: "Saved", duration: 2000 });
      }
    },
    [key, options?.notify],
  );

  return [value, setValue];
}

/**
 * Hook to get all preferences as a Map
 */
export function useAllPreferences(): Map<string, unknown> {
  const query = useMemo(() => preferencesRepo.buildAllPreferencesQuery(), []);
  const { data } = useReactiveQuery(preferencesRepo.getClient(), query);

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
 * Preference keys and their types
 */
export const PREFERENCE_KEYS = {
  THEME: "theme",
  COMPACT_MODE: "compactMode",
  SHOW_NODE_AVATARS: "showNodeAvatars",
  LANGUAGE: "language",
  DATE_FORMAT: "dateFormat",
  MESSAGE_SOUND_ENABLED: "messageSoundEnabled",
  ALERT_SOUND_ENABLED: "alertSoundEnabled",
  PACKET_BATCH_SIZE: "packetBatchSize",
  NODES_TABLE_COLUMN_VISIBILITY: "nodesTableColumnVisibility",
  NODES_TABLE_COLUMN_ORDER: "nodesTableColumnOrder",
  RASTER_SOURCES: "rasterSources",
} as const;

export type PreferenceKey =
  (typeof PREFERENCE_KEYS)[keyof typeof PREFERENCE_KEYS];
