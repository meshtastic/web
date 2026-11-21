import type { AddFilterWordError } from "@core/kmp/messageFilter.ts";
import { constantSignal } from "@core/kmp/signals.ts";
import { MessageFilterStorageError } from "@core/storage/messageFilter.ts";
import {
  type ConversationKey,
  conversationKeyString,
  parseConversationKey,
} from "@core/storage/types.ts";
import { Result } from "better-result";
import { useMemo } from "react";
import { useActiveClient } from "./registry.tsx";
import { useSignal } from "./useSignal.ts";

const NO_FLAG = constantSignal(false);
const NO_WORDS = constantSignal<readonly string[]>([]);
const NO_COUNT = constantSignal(0);

const notConnected = () =>
  new MessageFilterStorageError("no radio is connected");

export interface UseMessageFilterResult {
  /** False without a connected radio: the filter belongs to one. */
  readonly available: boolean;
  readonly enabled: boolean;
  /** Entries in the order they were added. */
  readonly words: readonly string[];
  setEnabled(
    enabled: boolean,
  ): Promise<Result<void, MessageFilterStorageError>>;
  /** Validates and adds an entry; Ok holds it as stored. */
  addWord(input: string): Promise<Result<string, AddFilterWordError>>;
  removeWord(word: string): Promise<Result<void, MessageFilterStorageError>>;
}

/** The connected radio's message filter: switch, words and their edits. */
export function useMessageFilter(): UseMessageFilterResult {
  const client = useActiveClient();
  const filter = client?.messageFilter;
  const enabled = useSignal(filter?.enabled ?? NO_FLAG);
  const words = useSignal(filter?.words ?? NO_WORDS);
  const actions = useMemo(
    () =>
      filter
        ? {
            setEnabled: (on: boolean) => filter.setEnabled(on),
            addWord: (input: string) => filter.addWord(input),
            removeWord: (word: string) => filter.removeWord(word),
          }
        : {
            setEnabled: () => Promise.resolve(Result.err(notConnected())),
            addWord: () =>
              Promise.resolve(
                Result.err<string, AddFilterWordError>({
                  kind: "storage",
                  error: notConnected(),
                }),
              ),
            removeWord: () => Promise.resolve(Result.err(notConnected())),
          },
    [filter],
  );
  return { available: filter !== undefined, enabled, words, ...actions };
}

export interface UseConversationFilterResult {
  /** Filtering is on for this radio. */
  readonly enabled: boolean;
  /** This conversation turned filtering off for itself. */
  readonly optedOut: boolean;
  /** Loaded incoming messages the filter matches here. */
  readonly filteredCount: number;
  /** Filtered messages are shown, marked, for now. */
  readonly revealed: boolean;
  setOptedOut(optedOut: boolean): void;
  setRevealed(revealed: boolean): void;
}

/** The message filter as one conversation's menu offers it. */
export function useConversationFilter(
  key: ConversationKey,
): UseConversationFilterResult {
  const client = useActiveClient();
  const k = conversationKeyString(key);
  const signals = useMemo(() => {
    if (!client) return undefined;
    const conv = parseConversationKey(k);
    return {
      optedOut: client.messageFilter.optedOut(conv),
      revealed: client.messageFilter.revealed(k),
      filteredCount: client.chat.filteredCount(conv),
    };
  }, [client, k]);
  const enabled = useSignal(client?.messageFilter.enabled ?? NO_FLAG);
  const optedOut = useSignal(signals?.optedOut ?? NO_FLAG);
  const revealed = useSignal(signals?.revealed ?? NO_FLAG);
  const filteredCount = useSignal(signals?.filteredCount ?? NO_COUNT);
  const actions = useMemo(
    () => ({
      setOptedOut: (value: boolean) => {
        void client?.messageFilter.setOptedOut(parseConversationKey(k), value);
      },
      setRevealed: (value: boolean) => {
        client?.messageFilter.setRevealed(parseConversationKey(k), value);
      },
    }),
    [client, k],
  );
  return { enabled, optedOut, filteredCount, revealed, ...actions };
}
