import { useMemo } from "react";
import { useReactiveQuery } from "sqlocal/react";
import { packetLogRepo } from "../repositories/index.ts";

export interface SignalLog {
  id: number;
  rxTime: Date;
  rxSnr: number;
  rxRssi: number;
}

/**
 * Hook to get signal logs (SNR/RSSI) for a specific node
 */
export function useSignalLogs(
  deviceId: number,
  nodeNum: number,
  limit = 100,
): {
  logs: SignalLog[];
  isLoading: boolean;
} {
  const query = useMemo(
    () => packetLogRepo.buildSignalLogsQuery(deviceId, nodeNum, limit),
    [deviceId, nodeNum, limit],
  );

  const { data, status } = useReactiveQuery(packetLogRepo.getClient(), query);

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

  return {
    logs,
    isLoading: status === "pending" && !data,
  };
}
