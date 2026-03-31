import {
  clear,
  createStore,
  del,
  entries as idbEntries,
  keys as idbKeys,
  set as idbSet,
} from "idb-keyval";
import { create } from "zustand";

const MAX_STORED_ENTRIES = 10_000;
const LIVE_BUFFER_SIZE = 500;
const PRUNE_EVERY_N = 100; // Check for pruning every N new entries

const logIdbStore = createStore("meshtastic-packet-log", "entries");

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  event: string;
  detail: string;
}

function makeEntryId(timestamp: number): string {
  // Zero-pad timestamp so lexicographic sort == chronological sort
  return `${String(timestamp).padStart(16, "0")}-${Math.random().toString(36).slice(2, 7)}`;
}

interface LogStore {
  /** Most recent entries (capped at LIVE_BUFFER_SIZE) */
  entries: LogEntry[];
  /** Total entries stored in IDB (may be larger than entries.length) */
  totalCount: number;
  isLoading: boolean;
  addEntry: (level: LogLevel, event: string, detail: string) => void;
  /** Load all entries from IDB into the live buffer (most recent first). */
  loadFromDB: () => Promise<void>;
  /** Wipe all entries from IDB and memory. */
  clearAll: () => Promise<void>;
}

export const useLogStore = create<LogStore>((zustandSet, zustandGet) => ({
  entries: [],
  totalCount: 0,
  isLoading: false,

  addEntry: (level, event, detail) => {
    const now = Date.now();
    const entry: LogEntry = {
      id: makeEntryId(now),
      timestamp: now,
      level,
      event,
      detail,
    };

    zustandSet((s) => {
      const next = [...s.entries, entry];
      return {
        entries: next.length > LIVE_BUFFER_SIZE ? next.slice(-LIVE_BUFFER_SIZE) : next,
        totalCount: s.totalCount + 1,
      };
    });

    // Persist to IDB asynchronously — fire and forget
    idbSet(entry.id, entry, logIdbStore).then(async () => {
      const count = zustandGet().totalCount;
      if (count % PRUNE_EVERY_N === 0) {
        try {
          const allKeys = (await idbKeys(logIdbStore)) as string[];
          if (allKeys.length > MAX_STORED_ENTRIES) {
            const sorted = [...allKeys].sort(); // lexicographic == chronological due to padding
            const toDelete = sorted.slice(0, allKeys.length - MAX_STORED_ENTRIES);
            await Promise.all(toDelete.map((k) => del(k, logIdbStore)));
          }
        } catch {
          // Pruning is best-effort
        }
      }
    });
  },

  loadFromDB: async () => {
    zustandSet({ isLoading: true });
    try {
      const all = (await idbEntries(logIdbStore)) as [string, LogEntry][];
      all.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const logEntries = all.map(([, v]) => v);
      zustandSet({
        entries: logEntries.slice(-LIVE_BUFFER_SIZE),
        totalCount: logEntries.length,
      });
    } catch {
      // Leave existing state intact if load fails
    } finally {
      zustandSet({ isLoading: false });
    }
  },

  clearAll: async () => {
    await clear(logIdbStore);
    zustandSet({ entries: [], totalCount: 0 });
  },
}));

/** Call this from anywhere (non-React code) to append a log entry. */
export function logEvent(level: LogLevel, event: string, detail: string): void {
  useLogStore.getState().addEntry(level, event, detail);
}
