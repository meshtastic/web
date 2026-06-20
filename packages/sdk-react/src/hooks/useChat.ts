import type {
  ChannelNumber,
  ConversationKey,
  Message,
  SendTextError,
  SendTextInput,
} from "@meshtastic/sdk";
import type { ResultType } from "better-result";
import { useCallback, useMemo } from "react";
import { useClient } from "../adapters/useClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

export interface UseChatResult {
  messages: Message[];
  send(input: SendTextInput): Promise<ResultType<number, SendTextError>>;
  loadOlder(before: Date, limit?: number): Promise<Message[]>;
}

export function useChat(channel: ChannelNumber): UseChatResult {
  const client = useClient();
  const sig = useMemo(() => client.chat.messages(channel), [client, channel]);
  const messages = useSignal(sig);
  const send = useCallback(
    (input: SendTextInput) => client.chat.send(input),
    [client],
  );
  const loadOlder = useCallback(
    (before: Date, limit?: number) => {
      const conv: ConversationKey = { kind: "channel", channel };
      return client.chat.loadOlder(conv, before, limit);
    },
    [client, channel],
  );
  return { messages, send, loadOlder };
}
