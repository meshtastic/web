import type { Result } from "neverthrow";
import { ResultAsync } from "neverthrow";
import { useCallback, useEffect, useState } from "react";
import { ChannelError } from "../errors.ts";
import { DB_EVENTS, dbEvents } from "../events.ts";
import { channelRepo } from "../repositories/index.ts";
import type { Channel } from "../schema.ts";

/**
 * Hook to fetch all channels for a device
 */
export function useChannels(deviceId: number) {
  const [channels, setChannels] = useState<Channel[]>([]);

  const refresh = useCallback(async (): Promise<
    Result<Channel[], ChannelError>
  > => {
    const result = await ResultAsync.fromPromise(
      channelRepo.getChannels(deviceId),
      (cause) => ChannelError.getChannels(deviceId, cause),
    );
    if (result.isOk()) {
      setChannels(result.value);
    }
    return result;
  }, [deviceId]);

  useEffect(() => {
    refresh();

    const unsubscribe = dbEvents.subscribe(DB_EVENTS.CHANNEL_UPDATED, refresh);
    return unsubscribe;
  }, [refresh]);

  return { channels, refresh };
}

/**
 * Hook to fetch a specific channel
 */
export function useChannel(deviceId: number, channelIndex: number) {
  const [channel, setChannel] = useState<Channel | undefined>(undefined);

  const refresh = useCallback(async (): Promise<
    Result<Channel | undefined, ChannelError>
  > => {
    const result = await ResultAsync.fromPromise(
      channelRepo.getChannel(deviceId, channelIndex),
      (cause) => ChannelError.getChannel(deviceId, channelIndex, cause),
    );
    if (result.isOk()) {
      setChannel(result.value);
    }
    return result;
  }, [deviceId, channelIndex]);

  useEffect(() => {
    refresh();

    const unsubscribe = dbEvents.subscribe(DB_EVENTS.CHANNEL_UPDATED, refresh);
    return unsubscribe;
  }, [refresh]);

  return { channel, refresh };
}

/**
 * Hook to fetch the primary channel
 */
export function usePrimaryChannel(deviceId: number) {
  const [channel, setChannel] = useState<Channel | undefined>(undefined);

  const refresh = useCallback(async (): Promise<
    Result<Channel | undefined, ChannelError>
  > => {
    const result = await ResultAsync.fromPromise(
      channelRepo.getPrimaryChannel(deviceId),
      (cause) => ChannelError.getPrimaryChannel(deviceId, cause),
    );
    if (result.isOk()) {
      setChannel(result.value);
    }
    return result;
  }, [deviceId]);

  useEffect(() => {
    refresh();

    const unsubscribe = dbEvents.subscribe(DB_EVENTS.CHANNEL_UPDATED, refresh);
    return unsubscribe;
  }, [refresh]);

  return { channel, refresh };
}
