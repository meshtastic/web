import { Protobuf } from "@meshtastic/sdk";

/** A device log record as kept by the debug panel. */
export interface DeviceLogEntry {
  id: number;
  /** When the record arrived, in ms; used when the node sent no time. */
  receivedAt: number;
  record: Protobuf.Mesh.LogRecord;
}

export const logLevelName = (level: Protobuf.Mesh.LogRecord_Level): string =>
  Protobuf.Mesh.LogRecord_Level[level] ?? String(level);

/** The record's time: the node's clock if it set one, else arrival time. */
export const logEntryTime = (entry: DeviceLogEntry): Date =>
  new Date(entry.record.time > 0 ? entry.record.time * 1000 : entry.receivedAt);

/** One line of text, as shown and exported. */
export function formatLogEntry(entry: DeviceLogEntry): string {
  const { level, source, message } = entry.record;
  const origin = source ? ` ${source}:` : "";
  return `${logEntryTime(entry).toISOString()} [${logLevelName(level)}]${origin} ${message}`;
}

/** Case-insensitive match on the formatted line. */
export function filterLogEntries(
  entries: readonly DeviceLogEntry[],
  query: string,
): DeviceLogEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...entries];
  return entries.filter((entry) =>
    formatLogEntry(entry).toLowerCase().includes(needle),
  );
}
