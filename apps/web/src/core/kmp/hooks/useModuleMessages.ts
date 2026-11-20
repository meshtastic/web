import {
  type ModuleMessageKind,
  moduleMessagesFor,
} from "@core/kmp/moduleMessages.ts";
import { constantSignal } from "@core/kmp/signals.ts";
import { useActiveClient } from "./registry.tsx";
import { Result } from "better-result";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSignal } from "./useSignal.ts";

export const MODULE_MESSAGES_TIMEOUT_MS = 15_000;

export interface UseModuleMessagesResult {
  value: string | undefined;
  isLoading: boolean;
  error: Error | undefined;
  refresh: () => void;
}

const EMPTY = constantSignal<string | undefined>(undefined);

function useModuleMessages(kind: ModuleMessageKind): UseModuleMessagesResult {
  const client = useActiveClient();
  const store = client ? moduleMessagesFor(client) : undefined;
  const value = useSignal(store ? store[kind] : EMPTY);
  // Loading from the first render, since the request goes out on mount.
  const [isLoading, setIsLoading] = useState(store !== undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const stopWaiting = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    setIsLoading(false);
  }, []);

  // The answer may repeat the cached value, so wait on the response rather
  // than on the signal changing.
  useEffect(() => {
    if (!store) return;
    return store.onResponse((answered) => {
      if (answered !== kind) return;
      setError(undefined);
      stopWaiting();
    });
  }, [store, kind, stopWaiting]);

  const refresh = useCallback(() => {
    if (!store) return;
    clearTimeout(timer.current);
    setIsLoading(true);
    setError(undefined);
    timer.current = setTimeout(() => {
      timer.current = undefined;
      setIsLoading(false);
      setError(new Error("The device did not answer"));
    }, MODULE_MESSAGES_TIMEOUT_MS);
    store.request(kind).then((result) => {
      if (Result.isError(result)) {
        setError(result.error);
        stopWaiting();
      }
    });
  }, [store, kind, stopWaiting]);

  useEffect(() => {
    refresh();
    return () => clearTimeout(timer.current);
  }, [refresh]);

  return { value, isLoading, error, refresh };
}

/** The device's canned message list. Asks the device for it on mount. */
export function useCannedMessages(): UseModuleMessagesResult {
  return useModuleMessages("cannedMessages");
}

/** The device's External Notification ringtone. Asks the device for it on mount. */
export function useRingtone(): UseModuleMessagesResult {
  return useModuleMessages("ringtone");
}
