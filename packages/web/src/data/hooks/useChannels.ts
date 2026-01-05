import { useMemo } from "react";
import { useReactiveQuery } from "sqlocal/react";
import { channelRepo } from "../repositories/index.ts";
import type { Channel } from "../schema.ts";

/**
 * Hook to fetch all channels for a device
 */
export function useChannels(deviceId: number) {
  const query = useMemo(
    () => channelRepo.buildChannelsQuery(deviceId),
    [deviceId],
  );

  const { data, status } = useReactiveQuery<Channel>(
    channelRepo.getClient(),
    query,
  );

  return {
    channels: data ?? [],
    isLoading: status === "pending" && !data,
  };
}

/**
 * Hook to fetch a specific channel
 */
export function useChannel(deviceId: number, channelIndex: number) {
  const query = useMemo(
    () => channelRepo.buildChannelQuery(deviceId, channelIndex),
    [deviceId, channelIndex],
  );

  const { data, status } = useReactiveQuery<Channel>(
    channelRepo.getClient(),
    query,
  );

  return {
    channel: data?.[0],
    isLoading: status === "pending" && !data,
  };
}
