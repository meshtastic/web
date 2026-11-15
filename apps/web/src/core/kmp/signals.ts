import type {
  ReadonlySignal as PreactReadonlySignal,
  Signal,
} from "@preact/signals-core";

/**
 * Reactive read-only view of a value, matching React's
 * `useSyncExternalStore` contract: subscribe for changes, read `value`.
 */
export interface ReadonlySignal<T> {
  readonly value: T;
  peek(): T;
  subscribe(listener: (value: T) => void): () => void;
}

export function toReadonly<T>(
  s: Signal<T> | PreactReadonlySignal<T>,
): ReadonlySignal<T> {
  return {
    get value() {
      return s.value;
    },
    peek: () => s.peek(),
    subscribe: (listener) => {
      let first = true;
      return s.subscribe((v) => {
        if (first) {
          first = false;
          return;
        }
        listener(v);
      });
    },
  };
}

export function constantSignal<T>(value: T): ReadonlySignal<T> {
  return { value, peek: () => value, subscribe: () => () => {} };
}
