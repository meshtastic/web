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

  const { data: packets } = useReactiveQuery(packetLogRepo.getClient(), query);

  const clearLogs = useCallback(async () => {
    await packetLogRepo.deleteAllPackets(deviceId);
  }, [deviceId]);

  return {
    packets: packets ?? [],
    clearLogs,
  };
}
