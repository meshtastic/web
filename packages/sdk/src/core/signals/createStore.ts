import {
  type ReadonlySignal as PreactReadonlySignal,
  type Signal,
  signal,
} from "@preact/signals-core";

/**
 * Reactive read-only view of a signal.
 *
 * Compatible with React's useSyncExternalStore contract: consumers subscribe
 * for change notifications and call `value` / `peek()` to read.
 */
export interface ReadonlySignal<T> {
  readonly value: T;
  peek(): T;
  subscribe(listener: (value: T) => void): () => void;
}

/**
 * Wraps a preact signal into the SDK's ReadonlySignal interface. The listener
 * is invoked asynchronously on every change. Returns both the writable signal
 * (for slice-internal use) and the readable facade (for external consumption).
 */
export function createStore<T>(initial: T): { write: Signal<T>; read: ReadonlySignal<T> } {
  const write = signal(initial);
  return { write, read: toReadonly(write) };
}

export function toReadonly<T>(s: Signal<T> | PreactReadonlySignal<T>): ReadonlySignal<T> {
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

/**
 * Keyed collection built on a single backing signal, emitting a new array
 * snapshot on each mutation. Sufficient for nodes/messages where consumers
 * subscribe to the whole list and filter locally.
 */
export class SignalMap<K, V> {
  private readonly inner: Map<K, V> = new Map();
  private readonly backing: Signal<ReadonlyArray<V>>;
  public readonly read: ReadonlySignal<ReadonlyArray<V>>;

  constructor() {
    this.backing = signal<ReadonlyArray<V>>([]);
    this.read = toReadonly(this.backing);
  }

  get(key: K): V | undefined {
    return this.inner.get(key);
  }

  has(key: K): boolean {
    return this.inner.has(key);
  }

  set(key: K, value: V): void {
    this.inner.set(key, value);
    this.backing.value = Array.from(this.inner.values());
  }

  delete(key: K): boolean {
    const removed = this.inner.delete(key);
    if (removed) {
      this.backing.value = Array.from(this.inner.values());
    }
    return removed;
  }

  clear(): void {
    if (this.inner.size === 0) {
      return;
    }
    this.inner.clear();
    this.backing.value = [];
  }

  get size(): number {
    return this.inner.size;
  }
}
