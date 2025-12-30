import { and, eq } from "drizzle-orm";
import { type Result, okAsync } from "neverthrow";
import { useCallback, useMemo } from "react";
import { useReactiveQuery } from "sqlocal/react";
import { getClient, getDb } from "../client.ts";
import { ChannelError } from "../errors.ts";
import { channels as channelsTable } from "../schema.ts";
import type { Channel } from "../schema.ts";

/**
 * Hook to fetch all channels for a device
 * Now reactive using sqlocal
 */
export function useChannels(deviceId: number) {
  const query = useMemo(
    () =>
      getDb()
        .select()
        .from(channelsTable)
        .where(eq(channelsTable.ownerNodeNum, deviceId)),
    [deviceId],
  );

  const { data, status } = useReactiveQuery(getClient(), query);

  const refresh = useCallback(async (): Promise<
    Result<Channel[], ChannelError>
  > => {
    return okAsync(data ?? []);
  }, [data]);

  return {
    channels: data ?? [],
    refresh,
    isLoading: status === "pending" && !data,
  };
}

/**
 * Hook to fetch a specific channel
 * Now reactive using sqlocal
 */
export function useChannel(deviceId: number, channelIndex: number) {
  const query = useMemo(
    () =>
      getDb()
        .select()
        .from(channelsTable)
        .where(
          and(
            eq(channelsTable.ownerNodeNum, deviceId),
            eq(channelsTable.channelIndex, channelIndex),
          ),
        )
        .limit(1),
    [deviceId, channelIndex],
  );

  const { data, status } = useReactiveQuery(getClient(), query);
  const channel = data?.[0];

  const refresh = useCallback(async (): Promise<
    Result<Channel | undefined, ChannelError>
  > => {
    return okAsync(channel);
  }, [channel]);

  return {
    channel,
    refresh,
    isLoading: status === "pending" && !data,
  };
}

/**
 * Hook to fetch the primary channel
 * Now reactive using sqlocal
 */
export function usePrimaryChannel(deviceId: number) {
  const query = useMemo(
    () =>
      getDb()
        .select()
        .from(channelsTable)
        .where(
          and(
            eq(channelsTable.ownerNodeNum, deviceId),
            eq(channelsTable.role, 1), // PRIMARY = 1
          ),
        )
        .limit(1),
    [deviceId],
  );

  const { data, status } = useReactiveQuery(getClient(), query);
  const channel = data?.[0];

  const refresh = useCallback(async (): Promise<
    Result<Channel | undefined, ChannelError>
  > => {
    return okAsync(channel);
  }, [channel]);

  return {
    channel,
    refresh,
    isLoading: status === "pending" && !data,
  };
}