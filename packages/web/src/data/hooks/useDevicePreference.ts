import { eq } from "drizzle-orm";
import { useMemo } from "react";
import { useReactiveQuery } from "sqlocal/react";
import { getClient, getDb } from "../client.ts";
import { preferences } from "../schema.ts";

/**
 * Hook to get a device-specific preference value
 * Now reactive using sqlocal
 */
export function useDevicePreference<T>(
  deviceId: number,
  key: string,
  defaultValue: T,
): T {
  const cacheKey = `device:${deviceId}:${key}`;

  const query = useMemo(
    () =>
      getDb()
        .select()
        .from(preferences)
        .where(eq(preferences.key, cacheKey))
        .limit(1),
    [cacheKey],
  );

  const { data, status } = useReactiveQuery(getClient(), query);

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

  // To maintain Suspense compatibility, we throw the query (which is thenable)
  // when the status is pending and we don't have data yet.
  if (status === "pending" && !data) {
    throw query;
  }

  return value;
}

/**
 * Deprecated: No longer needed with reactive queries
 */
export function invalidateDevicePreferenceCache(
  _deviceId: number,
  _key?: string,
): void {}