import { use, useMemo } from "react";
import { preferencesRepo } from "../repositories/index.ts";

// Cache for device preference promises
const devicePreferenceCache = new Map<string, Promise<unknown>>();

function getDevicePreferencePromise<T>(
  deviceId: number,
  key: string,
): Promise<T | undefined> {
  const cacheKey = `device:${deviceId}:${key}`;
  if (!devicePreferenceCache.has(cacheKey)) {
    devicePreferenceCache.set(cacheKey, preferencesRepo.get<T>(cacheKey));
  }
  return devicePreferenceCache.get(cacheKey) as Promise<T | undefined>;
}

export function invalidateDevicePreferenceCache(
  deviceId: number,
  key?: string,
): void {
  if (key) {
    devicePreferenceCache.delete(`device:${deviceId}:${key}`);
  } else {
    // Invalidate all preferences for this device
    for (const cacheKey of devicePreferenceCache.keys()) {
      if (cacheKey.startsWith(`device:${deviceId}:`)) {
        devicePreferenceCache.delete(cacheKey);
      }
    }
  }
}

/**
 * Hook to get a device-specific preference value
 * Uses React's `use()` API for Suspense integration
 */
export function useDevicePreference<T>(
  deviceId: number,
  key: string,
  defaultValue: T,
): T {
  const storedValue = use(getDevicePreferencePromise<T>(deviceId, key));
  return useMemo(
    () => storedValue ?? defaultValue,
    [storedValue, defaultValue],
  );
}
