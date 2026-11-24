/** The levels the app logs at, lowest first. */
export const LOG_LEVELS = ["trace", "debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/** One captured log line, already turned into text. */
export interface LogEntry {
  /** Epoch milliseconds. */
  readonly time: number;
  readonly level: LogLevel;
  /** The logger's name, e.g. `sdk` or `useConnections`. */
  readonly logger: string;
  readonly message: string;
}

/** A fixed-size buffer that keeps the newest items. */
export interface RingBuffer<T> {
  push(item: T): void;
  /** Oldest first. */
  entries(): T[];
  clear(): void;
}

export type LogBuffer = RingBuffer<LogEntry>;

/** Keeps the newest `capacity` items; older ones are dropped. */
export function createRingBuffer<T>(capacity: number): RingBuffer<T> {
  const size = Math.max(1, Math.floor(capacity));
  let ring: T[] = [];
  let next = 0;

  return {
    push(item) {
      if (ring.length < size) {
        ring.push(item);
        return;
      }
      ring[next] = item;
      next = (next + 1) % size;
    },
    entries() {
      return ring.length < size
        ? [...ring]
        : [...ring.slice(next), ...ring.slice(0, next)];
    },
    clear() {
      ring = [];
      next = 0;
    },
  };
}

/** Keeps the newest `capacity` log entries. */
export const createLogBuffer = (capacity: number): LogBuffer =>
  createRingBuffer<LogEntry>(capacity);
