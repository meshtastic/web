import { useCallback, useEffect, useState } from "react";
import { preferencesRepo } from "../repositories";

/**
 * Hook to get and set a preference value
 */
export function usePreference<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    preferencesRepo.get<T>(key).then((stored) => {
      if (mounted) {
        if (stored !== undefined) {
          setValue(stored);
        }
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [key]);

  const setPreference = useCallback(
    async (newValue: T) => {
      setValue(newValue);
      await preferencesRepo.set(key, newValue);
    },
    [key],
  );

  return [value, setPreference, isLoading];
}

/**
 * Hook specifically for panel sizes with debounced persistence
 */
export function usePanelSizes(
  panelGroupId: string,
  defaultSizes: number[],
): [number[], (sizes: number[]) => void] {
  const key = `panel-sizes:${panelGroupId}`;
  const [sizes, setSizes] = useState<number[]>(defaultSizes);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from database on mount
  useEffect(() => {
    let mounted = true;

    preferencesRepo.get<number[]>(key).then((stored) => {
      if (mounted) {
        if (stored !== undefined && Array.isArray(stored)) {
          setSizes(stored);
        }
        setIsInitialized(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, [key]);

  // Persist on change (called on drag end)
  const persistSizes = useCallback(
    (newSizes: number[]) => {
      setSizes(newSizes);
      // Only persist after initial load to avoid overwriting with defaults
      if (isInitialized) {
        preferencesRepo.set(key, newSizes);
      }
    },
    [key, isInitialized],
  );

  return [sizes, persistSizes];
}
