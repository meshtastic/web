import type { Channel } from "@meshtastic/sdk";
import { useClient } from "../adapters/useClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

export function useChannels(): ReadonlyArray<Channel> {
  const client = useClient();
  return useSignal(client.channels.list);
}

export function useChannel(index: number): Channel | undefined {
  const channels = useChannels();
  return channels.find((c) => c.index === index);
}
