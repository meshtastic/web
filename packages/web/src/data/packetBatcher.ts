import logger from "../core/services/logger.ts";
import { DEFAULT_PREFERENCES } from "@state/ui";
import { DB_EVENTS, dbEvents } from "./events.ts";
import { packetLogRepo, preferencesRepo } from "./repositories/index.ts";
import type { NewPacketLog } from "./schema.ts";

/**
 * Packet Batcher
 *
 * Collects packet logs and writes them in batched transactions
 * Batch size is configurable via the app preferences.
 */

const DEFAULT_FLUSH_INTERVAL = 250;

class PacketBatcher {
  private buffer: NewPacketLog[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isProcessing = false;
  private unsubscribe: (() => void) | null = null;
  private cachedBatchSize = DEFAULT_PREFERENCES.packetBatchSize;

  private get batchSize(): number {
    return this.cachedBatchSize;
  }

  /**
   * Initialize the batcher and subscribe to preference changes
   */
  async init(): Promise<void> {
    // Load initial batch size
    const savedSize = await preferencesRepo.get<number>("packetBatchSize");
    if (savedSize !== undefined) {
      this.cachedBatchSize = savedSize;
    }

    // Subscribe to batch size changes
    this.unsubscribe = dbEvents.subscribe(
      DB_EVENTS.PREFERENCE_UPDATED,
      async () => {
        const newSize = await preferencesRepo.get<number>("packetBatchSize");
        if (newSize !== undefined && newSize !== this.cachedBatchSize) {
          this.cachedBatchSize = newSize;
          logger.debug(`[PacketBatcher] Batch size changed to ${newSize}`);
        }
      },
    );
  }

  /**
   * Cleanup subscriptions
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Add a packet to the batch buffer
   */
  add(packet: NewPacketLog): void {
    this.buffer.push(packet);
    this.scheduleFlush();

    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer === null) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        void this.flush();
      }, DEFAULT_FLUSH_INTERVAL);
    }
  }

  /**
   * Flush all buffered packets to the database in a single transaction
   */
  async flush(): Promise<void> {
    if (this.isProcessing || this.buffer.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Take all current packets
    const packets = this.buffer.splice(0, this.buffer.length);

    try {
      await packetLogRepo.logPacketsBatch(packets);
    } catch (error) {
      logger.error("[PacketBatcher] Error flushing packets:", error);
    }

    this.isProcessing = false;

    // If more packets were added while processing, schedule another flush
    if (this.buffer.length > 0) {
      this.scheduleFlush();
    }
  }

  /**
   * Force flush immediately
   */
  async flushNow(): Promise<void> {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * Get current buffer size
   */
  get pending(): number {
    return this.buffer.length;
  }
}

// Singleton instance
export const packetBatcher = new PacketBatcher();

export { PacketBatcher };
