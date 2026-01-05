import { useCallback, useMemo } from "react";
import { useReactiveQuery } from "sqlocal/react";
import { packetLogRepo } from "../repositories/index.ts";
import type { PacketLog } from "../schema.ts";

/**
 * Hook to get packet logs for a device
 */
export function usePacketLogs(
  deviceId: number,
  limit = 100,
): {
  packets: PacketLog[];
  clearLogs: () => Promise<void>;
} {
  const query = useMemo(
    () => packetLogRepo.buildPacketLogsQuery(deviceId, limit),
    [deviceId, limit],
  );

  const { data: packets, status } = useReactiveQuery(
    packetLogRepo.getClient(),
    query,
  );

  const clearLogs = useCallback(async () => {
    await packetLogRepo.deleteAllPackets(deviceId);
  }, [deviceId]);

  // To maintain Suspense compatibility, we throw the query (which is thenable)
  // when the status is pending and we don't have data yet.
  if (status === "pending" && !packets) {
    throw query;
  }

  return {
    packets: packets ?? [],
    clearLogs,
  };
}
