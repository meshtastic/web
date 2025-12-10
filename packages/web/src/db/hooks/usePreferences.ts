import { use, useCallback, useMemo, useState } from "react";
import { preferencesRepo } from "../repositories";

// Cache for preference promises to ensure stable references
const preferencePromiseCache = new Map<string, Promise<unknown>>();

function getPreferencePromise<T>(key: string): Promise<T | undefined> {
  if (!preferencePromiseCache.has(key)) {
    preferencePromiseCache.set(key, preferencesRepo.get<T>(key));
  }
  return preferencePromiseCache.get(key) as Promise<T | undefined>;
}

function invalidatePreferenceCache(key: string): void {
  preferencePromiseCache.delete(key);
}

/**
 * Hook to get and set a preference value
 * Uses React's `use()` API for Suspense integration
 */
export function usePreference<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const storedValue = use(getPreferencePromise<T>(key));
  const [value, setValue] = useState<T>(storedValue ?? defaultValue);

  const setPreference = useCallback(
    (newValue: T) => {
      setValue(newValue);
      invalidatePreferenceCache(key);
      preferencesRepo.set(key, newValue);
    },
    [key],
  );

  return [value, setPreference];
}

/**
 * Hook specifically for panel sizes with persistence
 * Uses React's `use()` API for Suspense integration
 */
export function usePanelSizes(
  panelGroupId: string,
  defaultSizes: number[],
): [number[], (sizes: number[]) => void] {
  const key = `panel-sizes:${panelGroupId}`;
  const storedSizes = use(getPreferencePromise<number[]>(key));

  const initialSizes = useMemo(() => {
    if (storedSizes !== undefined && Array.isArray(storedSizes)) {
      return storedSizes;
    }
    return defaultSizes;
  }, [storedSizes, defaultSizes]);

  const [sizes, setSizes] = useState<number[]>(initialSizes);

  const persistSizes = useCallback(
    (newSizes: number[]) => {
      setSizes(newSizes);
      invalidatePreferenceCache(key);
      preferencesRepo.set(key, newSizes);
    },
    [key],
  );

  return [sizes, persistSizes];
}
