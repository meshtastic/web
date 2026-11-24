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

export interface LogBuffer {
  push(entry: LogEntry): void;
  /** Oldest first. */
  entries(): LogEntry[];
  clear(): void;
}

/** Keeps the newest `capacity` entries; older ones are dropped. */
export function createLogBuffer(capacity: number): LogBuffer {
  const size = Math.max(1, Math.floor(capacity));
  let ring: LogEntry[] = [];
  let next = 0;

  return {
    push(entry) {
      if (ring.length < size) {
        ring.push(entry);
        return;
      }
      ring[next] = entry;
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
