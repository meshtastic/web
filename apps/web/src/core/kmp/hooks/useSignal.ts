import type { ReadonlySignal } from "@core/kmp/signals.ts";
import { useSyncExternalStore } from "react";

/** Subscribes a component to a signal and returns its current value. */
export function useSignal<T>(sig: ReadonlySignal<T>): T {
  return useSyncExternalStore(
    sig.subscribe,
    () => sig.value,
    () => sig.peek(),
  );
}
