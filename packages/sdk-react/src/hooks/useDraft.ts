import type { ConversationKey } from "@meshtastic/sdk";
import { useCallback, useMemo } from "react";
import { useClient } from "../adapters/useClient.ts";
import { useSignal } from "../adapters/useSignal.ts";

export interface UseDraftResult {
  text: string;
  setText(value: string): void;
  clear(): void;
}

/**
 * Per-conversation draft text bound to the SDK chat slice. Re-renders on
 * every change. Auto-clears when send() succeeds.
 */
export function useDraft(conv: ConversationKey): UseDraftResult {
  const client = useClient();
  const sig = useMemo(() => client.chat.drafts.get(conv), [client, conv.kind, keyOf(conv)]);
  const text = useSignal(sig);
  const setText = useCallback(
    (value: string) => client.chat.drafts.set(conv, value),
    [client, conv],
  );
  const clear = useCallback(() => client.chat.drafts.clear(conv), [client, conv]);
  return { text, setText, clear };
}

function keyOf(conv: ConversationKey): number {
  return conv.kind === "channel" ? conv.channel : conv.peer;
}
