import type { ReadonlySignal } from "@meshtastic/sdk";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Like `useSignal` but projects the signal value through a selector before
 * returning. The selector should be stable; memoize it with `useCallback` in
 * the caller when it closes over changing values.
 */
export function useSignalValue<T, U>(sig: ReadonlySignal<T>, select: (value: T) => U): U {
  const getSnapshot = useCallback(() => select(sig.value), [sig, select]);
  const getServerSnapshot = useCallback(() => select(sig.peek()), [sig, select]);
  return useSyncExternalStore(sig.subscribe, getSnapshot, getServerSnapshot);
}
