import { use, useCallback, useMemo, useState } from "react";
import { packetLogRepo } from "../repositories/index.ts";
import type { PacketLog } from "../schema.ts";

// Cache for packet log promises
const packetLogPromiseCache = new Map<string, Promise<PacketLog[]>>();

function getPacketLogsPromise(
  deviceId: number,
  limit: number,
): Promise<PacketLog[]> {
  const key = `${deviceId}:${limit}`;
  if (!packetLogPromiseCache.has(key)) {
    packetLogPromiseCache.set(key, packetLogRepo.getPackets(deviceId, limit));
  }
  return packetLogPromiseCache.get(key) as Promise<PacketLog[]>;
}

export function invalidatePacketLogsCache(deviceId?: number): void {
  if (deviceId !== undefined) {
    // Invalidate all cache entries for this device
    for (const key of packetLogPromiseCache.keys()) {
      if (key.startsWith(`${deviceId}:`)) {
        packetLogPromiseCache.delete(key);
      }
    }
  } else {
    packetLogPromiseCache.clear();
  }
}

/**
 * Hook to get packet logs for a device
 * Uses React's `use()` API for Suspense integration
 */
export function usePacketLogs(
  deviceId: number,
  limit = 100,
): {
  packets: PacketLog[];
  refresh: () => void;
  isRefreshing: boolean;
  clearLogs: () => Promise<void>;
} {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Invalidate cache when refreshKey changes
  useMemo(() => {
    if (refreshKey > 0) {
      invalidatePacketLogsCache(deviceId);
    }
  }, [refreshKey, deviceId]);

  const packets = use(getPacketLogsPromise(deviceId, limit));

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    invalidatePacketLogsCache(deviceId);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 100);
  }, [deviceId]);

  const clearLogs = useCallback(async () => {
    await packetLogRepo.deleteAllPackets(deviceId);
    invalidatePacketLogsCache(deviceId);
    setRefreshKey((k) => k + 1);
  }, [deviceId]);

  return { packets, refresh, isRefreshing, clearLogs };
}
