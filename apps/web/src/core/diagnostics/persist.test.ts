import { describe, expect, it } from "vitest";
import type { LogEntry } from "./logBuffer.ts";
import {
  decodeLog,
  encodeLog,
  loadLog,
  PERSISTED_LOG_KEY,
  saveLog,
} from "./persist.ts";

const entry = (n: number, message = `line ${n}`): LogEntry => ({
  time: n,
  level: "debug",
  logger: "sdk",
  message,
});

/** A Storage stand-in that refuses values longer than `quota`. */
function memoryStorage(quota = Number.POSITIVE_INFINITY) {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (value.length > quota) throw new Error("QuotaExceededError");
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
  };
}

describe("encodeLog and decodeLog", () => {
  it("round-trips entries", () => {
    const entries = [entry(1), entry(2)];
    expect(decodeLog(encodeLog(entries))).toEqual(entries);
  });

  it("redacts messages before they are stored", () => {
    expect(encodeLog([entry(1, "GET https://192.168.1.40/json")])).not.toContain(
      "192.168",
    );
  });

  it("skips malformed entries and bad JSON", () => {
    expect(
      decodeLog(
        JSON.stringify([
          entry(1),
          { time: "x", level: "info", logger: "a", message: "b" },
          { time: 2, level: "loud", logger: "a", message: "b" },
          null,
        ]),
      ),
    ).toEqual([entry(1)]);
    expect(decodeLog("{not json")).toEqual([]);
    expect(decodeLog(JSON.stringify({ time: 1 }))).toEqual([]);
    expect(decodeLog(null)).toEqual([]);
  });
});

describe("saveLog and loadLog", () => {
  it("saves and loads through storage", () => {
    const storage = memoryStorage();
    saveLog(storage, [entry(1), entry(2)]);
    expect(loadLog(storage)).toEqual([entry(1), entry(2)]);
  });

  it("keeps only the newest lines when the whole log is over quota", () => {
    const entries = Array.from({ length: 400 }, (_, n) => entry(n));
    const storage = memoryStorage(encodeLog(entries.slice(-300)).length);
    saveLog(storage, entries);
    const loaded = loadLog(storage);
    expect(loaded).toHaveLength(300);
    expect(loaded[0]?.time).toBe(100);
  });

  it("removes the saved log when even the fallback does not fit", () => {
    const storage = memoryStorage(10);
    storage.items.set(PERSISTED_LOG_KEY, "stale");
    saveLog(storage, [entry(1)]);
    expect(storage.items.has(PERSISTED_LOG_KEY)).toBe(false);
  });

  it("loads nothing when storage throws", () => {
    expect(
      loadLog({
        getItem: () => {
          throw new Error("SecurityError");
        },
      }),
    ).toEqual([]);
  });
});
