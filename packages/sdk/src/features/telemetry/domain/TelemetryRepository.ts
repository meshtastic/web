import type { TelemetryReading } from "./TelemetryReading.ts";

export interface TelemetryRetentionPolicy {
  /** Keep at most this many readings per node. */
  maxPerNode?: number;
  /** Drop anything older than this many ms. */
  olderThanMs?: number;
}

/**
 * Port for persisting telemetry readings. Implementations live in adapter
 * packages (e.g. `@meshtastic/sdk-storage-sqlocal`) or in-memory within the
 * SDK itself.
 *
 * Reads are paginated by node so consumers can lazy-load history on scroll
 * rather than rehydrating every reading at boot.
 */
export interface TelemetryRepository {
  loadRecent(nodeNum: number, limit: number): Promise<TelemetryReading[]>;
  loadBefore(nodeNum: number, cursor: Date, limit: number): Promise<TelemetryReading[]>;
  append(reading: TelemetryReading): Promise<void>;
  appendBatch(readings: ReadonlyArray<TelemetryReading>): Promise<void>;
  prune(policy: TelemetryRetentionPolicy): Promise<void>;
  clearNode(nodeNum: number): Promise<void>;
  clear(): Promise<void>;
}
