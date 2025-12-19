import { use, useCallback, useMemo, useState } from "react";
import { packetLogRepo } from "../repositories/index.ts";
import type { PacketLog } from "../schema.ts";

export interface SignalLog {
  id: number;
  rxTime: Date;
  rxSnr: number;
  rxRssi: number;
}

// Cache for signal log promises
const signalLogPromiseCache = new Map<string, Promise<SignalLog[]>>();

async function fetchSignalLogs(
  deviceId: number,
  nodeNum: number,
  limit: number,
): Promise<SignalLog[]> {
  const packets = await packetLogRepo.getPacketsFromNode(
    deviceId,
    nodeNum,
    limit * 2, // Fetch more since we filter
  );

  // Filter packets that have signal data and map to SignalLog
  return packets
    .filter(
      (p): p is PacketLog & { rxSnr: number; rxRssi: number; rxTime: Date } =>
        p.rxSnr !== null && p.rxRssi !== null && p.rxTime !== null,
    )
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      rxTime: p.rxTime,
      rxSnr: p.rxSnr,
      rxRssi: p.rxRssi,
    }));
}

function getSignalLogsPromise(
  deviceId: number,
  nodeNum: number,
  limit: number,
): Promise<SignalLog[]> {
  const key = `${deviceId}:${nodeNum}:${limit}`;
  if (!signalLogPromiseCache.has(key)) {
    signalLogPromiseCache.set(key, fetchSignalLogs(deviceId, nodeNum, limit));
  }
  return signalLogPromiseCache.get(key) as Promise<SignalLog[]>;
}

export function invalidateSignalLogsCache(
  deviceId?: number,
  nodeNum?: number,
): void {
  if (deviceId !== undefined && nodeNum !== undefined) {
    for (const key of signalLogPromiseCache.keys()) {
      if (key.startsWith(`${deviceId}:${nodeNum}:`)) {
        signalLogPromiseCache.delete(key);
      }
    }
  } else if (deviceId !== undefined) {
    for (const key of signalLogPromiseCache.keys()) {
      if (key.startsWith(`${deviceId}:`)) {
        signalLogPromiseCache.delete(key);
      }
    }
  } else {
    signalLogPromiseCache.clear();
  }
}

/**
 * Hook to get signal logs (SNR/RSSI) for a specific node
 * Uses React's `use()` API for Suspense integration
 */
export function useSignalLogs(
  deviceId: number,
  nodeNum: number,
  limit = 100,
): {
  logs: SignalLog[];
  refresh: () => void;
  isRefreshing: boolean;
} {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Invalidate cache when refreshKey changes
  useMemo(() => {
    if (refreshKey > 0) {
      invalidateSignalLogsCache(deviceId, nodeNum);
    }
  }, [refreshKey, deviceId, nodeNum]);

  const logs = use(getSignalLogsPromise(deviceId, nodeNum, limit));

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    invalidateSignalLogsCache(deviceId, nodeNum);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 100);
  }, [deviceId, nodeNum]);

  return { logs, refresh, isRefreshing };
}
