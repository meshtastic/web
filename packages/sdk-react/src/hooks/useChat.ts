import type { ChannelNumber, Message, SendTextError, SendTextInput } from "@meshtastic/sdk";
import type { ResultType } from "better-result";
import { useCallback, useMemo } from "react";
import { useClient } from "../adapters/useClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

export interface UseChatResult {
  messages: Message[];
  send(input: SendTextInput): Promise<ResultType<number, SendTextError>>;
}

export function useChat(channel: ChannelNumber): UseChatResult {
  const client = useClient();
  const sig = useMemo(() => client.chat.messages(channel), [client, channel]);
  const messages = useSignal(sig);
  const send = useCallback((input: SendTextInput) => client.chat.send(input), [client]);
  return { messages, send };
}
