import { useMemo } from "react";
import { channelRepo } from "../repositories/index.ts";
import { useReactiveSQL } from "./useReactiveSQL.ts";
import type { Channel } from "../schema.ts";

/**
 * Hook to fetch all channels for a device
 */
export function useChannels(deviceId: number) {
  const query = useMemo(
    () => channelRepo.buildChannelsQuery(deviceId),
    [deviceId],
  );

  const { data } = useReactiveSQL<Channel>(channelRepo.getClient(), query);

  return {
    channels: data ?? [],
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

  const { data, status } = useReactiveSQL<Channel>(
    channelRepo.getClient(),
    query,
  );

  return {
    channel: data?.[0],
    isLoading: status === "pending" && !data,
  };
}
