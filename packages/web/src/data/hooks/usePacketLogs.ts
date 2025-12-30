import { desc, eq } from "drizzle-orm";
import { useCallback, useMemo } from "react";
import { useReactiveQuery } from "sqlocal/react";
import { getClient, getDb } from "../client.ts";
import { packetLogRepo } from "../repositories/index.ts";
import { type PacketLog, packetLogs } from "../schema.ts";

/**
 * Reactive hook to get packet logs for a device
 */
export function usePacketLogs(
  deviceId: number,
  limit = 100,
): {
  packets: PacketLog[];
  clearLogs: () => Promise<void>;
} {
  const query = useMemo(
    () =>
      getDb()
        .select()
        .from(packetLogs)
        .where(eq(packetLogs.ownerNodeNum, deviceId))
        .orderBy(desc(packetLogs.rxTime))
        .limit(limit),
    [deviceId, limit],
  );

  const { data: packets, status } = useReactiveQuery(getClient(), query);

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
