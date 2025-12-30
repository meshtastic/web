import { and, desc, eq, isNotNull } from "drizzle-orm";
import { useCallback, useMemo } from "react";
import { useReactiveQuery } from "sqlocal/react";
import { getClient, getDb } from "../client.ts";
import { packetLogs } from "../schema.ts";

export interface SignalLog {
  id: number;
  rxTime: Date;
  rxSnr: number;
  rxRssi: number;
}

/**
 * Hook to get signal logs (SNR/RSSI) for a specific node
 * Now reactive! Automatically updates when new packets are logged.
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
  const query = useMemo(
    () =>
      getDb()
        .select({
          id: packetLogs.id,
          rxTime: packetLogs.rxTime,
          rxSnr: packetLogs.rxSnr,
          rxRssi: packetLogs.rxRssi,
        })
        .from(packetLogs)
        .where(
          and(
            eq(packetLogs.ownerNodeNum, deviceId),
            eq(packetLogs.fromNode, nodeNum),
            isNotNull(packetLogs.rxSnr),
            isNotNull(packetLogs.rxRssi),
          ),
        )
        .orderBy(desc(packetLogs.rxTime))
        .limit(limit),
    [deviceId, nodeNum, limit],
  );

  const { data, status } = useReactiveQuery(getClient(), query);

  const logs: SignalLog[] = useMemo(() => {
    return (data ?? []).reduce<SignalLog[]>((acc, p) => {
      if (p.rxSnr !== null && p.rxRssi !== null) {
        acc.push({
          id: p.id,
          rxTime: p.rxTime,
          rxSnr: p.rxSnr,
          rxRssi: p.rxRssi,
        });
      }
      return acc;
    }, []);
  }, [data]);

  const refresh = useCallback(() => {
    // No-op for reactive query
  }, []);

  // To maintain Suspense compatibility, we throw the query (which is thenable)
  // when the status is pending and we don't have data yet.
  if (status === "pending" && !data) {
    throw query;
  }

  return {
    logs,
    refresh,
    isRefreshing: status === "pending",
  };
}