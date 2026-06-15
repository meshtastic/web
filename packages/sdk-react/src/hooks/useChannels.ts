import type { Channel } from "@meshtastic/sdk";
import { useActiveClient } from "../adapters/useActiveClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

const EMPTY: ReadonlyArray<Channel> = [];
const EMPTY_SIGNAL = {
  value: EMPTY,
  peek: () => EMPTY,
  subscribe: () => () => {},
};

/**
 * Returns the channel list from the active client. Empty when no client
 * is active (e.g. before any device connects, or in isolated tests).
 */
export function useChannels(): ReadonlyArray<Channel> {
  const client = useActiveClient();
  return useSignal(client?.channels.list ?? EMPTY_SIGNAL);
}

export function useChannel(index: number): Channel | undefined {
  const channels = useChannels();
  return channels.find((c) => c.index === index);
}
