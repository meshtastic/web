import type { ConversationKey, Message, SendTextError, SendTextInput } from "@meshtastic/sdk";
import type { ResultType } from "better-result";
import { useCallback, useMemo } from "react";
import { useClient } from "../adapters/useClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

export interface UseDirectChatResult {
  messages: Message[];
  send(input: SendTextInput): Promise<ResultType<number, SendTextError>>;
  loadOlder(before: Date, limit?: number): Promise<Message[]>;
}

/**
 * Direct-message conversation with a single peer node. The bucket is keyed
 * by the peer (so messages from-me-to-peer and from-peer-to-me share one
 * bucket). Lazy-hydrates from the configured MessageRepository on first
 * subscribe.
 */
export function useDirectChat(peer: number): UseDirectChatResult {
  const client = useClient();
  const sig = useMemo(() => client.chat.direct(peer), [client, peer]);
  const messages = useSignal(sig);
  const send = useCallback((input: SendTextInput) => client.chat.send(input), [client]);
  const loadOlder = useCallback(
    (before: Date, limit?: number) => {
      const conv: ConversationKey = { kind: "direct", peer };
      return client.chat.loadOlder(conv, before, limit);
    },
    [client, peer],
  );
  return { messages, send, loadOlder };
}
