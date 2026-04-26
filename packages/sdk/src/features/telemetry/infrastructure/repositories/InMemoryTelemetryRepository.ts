import type { TelemetryReading } from "../../domain/TelemetryReading.ts";
import type {
  TelemetryRepository,
  TelemetryRetentionPolicy,
} from "../../domain/TelemetryRepository.ts";

/**
 * Default in-memory TelemetryRepository. No persistence across reloads.
 * Suitable for tests and for single-session apps that do not need history.
 */
export class InMemoryTelemetryRepository implements TelemetryRepository {
  private readonly buckets = new Map<number, TelemetryReading[]>();

  async loadRecent(nodeNum: number, limit: number): Promise<TelemetryReading[]> {
    return (this.buckets.get(nodeNum) ?? []).slice(-limit);
  }

  async loadBefore(nodeNum: number, cursor: Date, limit: number): Promise<TelemetryReading[]> {
    const bucket = this.buckets.get(nodeNum) ?? [];
    const idx = bucket.findIndex((r) => r.time >= cursor);
    const end = idx === -1 ? bucket.length : idx;
    const start = Math.max(0, end - limit);
    return bucket.slice(start, end);
  }

  async append(reading: TelemetryReading): Promise<void> {
    await this.appendBatch([reading]);
  }

  async appendBatch(readings: ReadonlyArray<TelemetryReading>): Promise<void> {
    for (const reading of readings) {
      const bucket = this.buckets.get(reading.nodeNum) ?? [];
      bucket.push(reading);
      bucket.sort((a, b) => a.time.getTime() - b.time.getTime());
      this.buckets.set(reading.nodeNum, bucket);
    }
  }

  async prune(policy: TelemetryRetentionPolicy): Promise<void> {
    const cutoff = policy.olderThanMs ? Date.now() - policy.olderThanMs : undefined;
    for (const [nodeNum, bucket] of this.buckets.entries()) {
      let next = bucket;
      if (cutoff !== undefined) {
        next = next.filter((r) => r.time.getTime() >= cutoff);
      }
      if (policy.maxPerNode !== undefined && next.length > policy.maxPerNode) {
        next = next.slice(-policy.maxPerNode);
      }
      this.buckets.set(nodeNum, next);
    }
  }

  async clearNode(nodeNum: number): Promise<void> {
    this.buckets.delete(nodeNum);
  }

  async clear(): Promise<void> {
    this.buckets.clear();
  }
}
