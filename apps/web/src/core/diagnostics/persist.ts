import { LOG_LEVELS, type LogEntry, type LogLevel } from "./logBuffer.ts";
import { redactText } from "./redact.ts";

/** The sessionStorage key that carries the log across a reload. */
export const PERSISTED_LOG_KEY = "mesh-diagnostics-log";

/** Kept when the whole log does not fit in storage. */
const FALLBACK_LINES = 300;

const isLogLevel = (value: unknown): value is LogLevel =>
  LOG_LEVELS.some((level) => level === value);

function isLogEntry(value: unknown): value is LogEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "time" in value &&
    typeof value.time === "number" &&
    "level" in value &&
    isLogLevel(value.level) &&
    "logger" in value &&
    typeof value.logger === "string" &&
    "message" in value &&
    typeof value.message === "string"
  );
}

/** Entries as stored text, redacted first so storage never holds addresses. */
export function encodeLog(entries: readonly LogEntry[]): string {
  return JSON.stringify(
    entries.map((entry) => ({ ...entry, message: redactText(entry.message) })),
  );
}

/** The entries in `text`, skipping any that are malformed. */
export function decodeLog(text: string | null): LogEntry[] {
  if (!text) return [];
  try {
    const parsed: unknown = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.filter(isLogEntry) : [];
  } catch {
    return [];
  }
}

/**
 * Stores `entries`, or only the newest {@link FALLBACK_LINES} when the whole
 * log is over quota. Storage errors are swallowed: losing the log on reload
 * is better than breaking the page.
 */
export function saveLog(
  storage: Pick<Storage, "setItem" | "removeItem">,
  entries: readonly LogEntry[],
): void {
  for (const batch of [entries, entries.slice(-FALLBACK_LINES)]) {
    try {
      storage.setItem(PERSISTED_LOG_KEY, encodeLog(batch));
      return;
    } catch {
      // Over quota: try the smaller batch.
    }
  }
  try {
    storage.removeItem(PERSISTED_LOG_KEY);
  } catch {
    // Storage is unavailable.
  }
}

export function loadLog(storage: Pick<Storage, "getItem">): LogEntry[] {
  try {
    return decodeLog(storage.getItem(PERSISTED_LOG_KEY));
  } catch {
    return [];
  }
}
