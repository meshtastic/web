/**
 * Preferences hooks using useSyncExternalStore for React 19 best practices
 *
 * These hooks subscribe to database events and provide reactive preference data
 * without the tearing issues that can occur with useState + useEffect patterns.
 */

import { useCallback, useSyncExternalStore } from "react";
import { DB_EVENTS, dbEvents } from "../events.ts";
import { preferencesRepo } from "../repositories/index.ts";


/**
 * Cache for preference data supporting useSyncExternalStore
 */
class PreferenceCache {
  private data = new Map<string, unknown>();
  private listeners = new Set<() => void>();
  private initialized = new Set<string>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.data.set(key, value);
    this.initialized.add(key);
    this.notify();
  }

  isInitialized(key: string): boolean {
    return this.initialized.has(key);
  }

  async refresh(key: string): Promise<void> {
    const value = await preferencesRepo.get(key);
    this.set(key, value);
  }

  invalidate(key: string): void {
    this.initialized.delete(key);
  }
}

const preferenceCache = new PreferenceCache();

/**
 * Invalidate the cache for a specific preference key
 */
export function invalidatePreferenceCache(key: string): void {
  preferenceCache.invalidate(key);
}


/**
 * Hook to get and set a single preference value
 * Auto-refreshes when preferences are updated
 */
export function usePreference<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => Promise<void>] {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubCache = preferenceCache.subscribe(onStoreChange);
      const unsubDb = dbEvents.subscribe(
        DB_EVENTS.PREFERENCE_UPDATED,
        async () => {
          await preferenceCache.refresh(key);
        },
      );

      // Initial load if not already cached
      if (!preferenceCache.isInitialized(key)) {
        preferenceCache.refresh(key);
      }

      return () => {
        unsubCache();
        unsubDb();
      };
    },
    [key],
  );

  const getSnapshot = useCallback((): T => {
    const cached = preferenceCache.get<T>(key);
    return cached !== undefined ? cached : defaultValue;
  }, [key, defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setValue = useCallback(
    async (newValue: T): Promise<void> => {
      // Optimistic update
      preferenceCache.set(key, newValue);
      // Persist to database
      await preferencesRepo.set(key, newValue);
      // Emit event for other subscribers
      dbEvents.emit(DB_EVENTS.PREFERENCE_UPDATED);
    },
    [key],
  );

  return [value, setValue];
}


/**
 * Cache for all preferences
 */
class AllPreferencesCache {
  private data: Map<string, unknown> = new Map();
  private listeners = new Set<() => void>();
  private initialized = false;

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  get(): Map<string, unknown> {
    return this.data;
  }

  set(data: Map<string, unknown>): void {
    this.data = data;
    this.initialized = true;
    this.notify();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async refresh(): Promise<void> {
    const data = await preferencesRepo.getAll();
    this.set(data);
  }
}

const allPreferencesCache = new AllPreferencesCache();

/**
 * Hook to get all preferences as a Map
 * Auto-refreshes when any preference is updated
 */
export function useAllPreferences(): Map<string, unknown> {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const unsubCache = allPreferencesCache.subscribe(onStoreChange);
    const unsubDb = dbEvents.subscribe(
      DB_EVENTS.PREFERENCE_UPDATED,
      async () => {
        await allPreferencesCache.refresh();
      },
    );

    // Initial load if not already cached
    if (!allPreferencesCache.isInitialized()) {
      allPreferencesCache.refresh();
    }

    return () => {
      unsubCache();
      unsubDb();
    };
  }, []);

  const getSnapshot = useCallback(() => allPreferencesCache.get(), []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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

export type PreferenceKey = (typeof PREFERENCE_KEYS)[keyof typeof PREFERENCE_KEYS];
