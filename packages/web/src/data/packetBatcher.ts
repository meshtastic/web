import logger from "../core/services/logger.ts";
import { DEFAULT_PREFERENCES } from "@state/ui";
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
  private cachedBatchSize = DEFAULT_PREFERENCES.packetBatchSize;

  /**
   * Get the current batch size, reading from preferences on each flush
   */
  private async refreshBatchSize(): Promise<void> {
    const savedSize = await preferencesRepo.get<number>("packetBatchSize");
    if (savedSize !== undefined && savedSize !== this.cachedBatchSize) {
      this.cachedBatchSize = savedSize;
      logger.debug(`[PacketBatcher] Batch size updated to ${savedSize}`);
    }
  }

  /**
   * Cleanup timers
   */
  destroy(): void {
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

    if (this.buffer.length >= this.cachedBatchSize) {
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

    // Refresh batch size from preferences (reads on each flush, not on each add)
    await this.refreshBatchSize();

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
