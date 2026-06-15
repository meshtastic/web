import type { ReadonlySignal } from "@meshtastic/sdk";
import { useSyncExternalStore } from "react";

/**
 * Subscribes a component to a SDK ReadonlySignal and returns the current value.
 *
 * Uses useSyncExternalStore so concurrent-mode renders see a consistent
 * snapshot. The signal's `.subscribe` is called once per mount.
 */
export function useSignal<T>(sig: ReadonlySignal<T>): T {
  return useSyncExternalStore(
    sig.subscribe,
    () => sig.value,
    () => sig.peek(),
  );
}
