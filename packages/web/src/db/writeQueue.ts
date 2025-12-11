/**
 * Database Write Queue
 *
 * Batches and debounces database writes to improve performance
 * when receiving high volumes of packets.
 */

type WriteOperation<T> = {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

interface WriteQueueOptions {
  /** Maximum number of operations to batch together */
  batchSize?: number;
  /** Maximum time to wait before flushing the queue (ms) */
  flushInterval?: number;
  /** Whether to log queue statistics */
  debug?: boolean;
}

const DEFAULT_OPTIONS: Required<WriteQueueOptions> = {
  batchSize: 50,
  flushInterval: 100,
  debug: false,
};

class WriteQueue {
  private queue: WriteOperation<unknown>[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private isProcessing = false;
  private options: Required<WriteQueueOptions>;

  // Statistics
  private stats = {
    totalOperations: 0,
    totalBatches: 0,
    totalErrors: 0,
  };

  constructor(options: WriteQueueOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Add a write operation to the queue
   * Returns a promise that resolves when the operation completes
   */
  enqueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: operation as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      this.scheduleFlush();

      // If we've hit the batch size, flush immediately
      if (this.queue.length >= this.options.batchSize) {
        this.flush();
      }
    });
  }

  /**
   * Schedule a flush if one isn't already scheduled
   */
  private scheduleFlush(): void {
    if (this.flushTimer === null) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        this.flush();
      }, this.options.flushInterval);
    }
  }

  /**
   * Process all queued operations
   */
  private async flush(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Take all current operations
    const operations = this.queue.splice(0, this.queue.length);
    this.stats.totalBatches++;

    if (this.options.debug) {
      console.log(`[WriteQueue] Flushing ${operations.length} operations`);
    }

    // Process all operations concurrently but settle individually
    const results = await Promise.allSettled(
      operations.map(async (op) => {
        try {
          const result = await op.execute();
          op.resolve(result);
          this.stats.totalOperations++;
          return result;
        } catch (error) {
          this.stats.totalErrors++;
          op.reject(error instanceof Error ? error : new Error(String(error)));
          throw error;
        }
      }),
    );

    if (this.options.debug) {
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        console.warn(`[WriteQueue] ${failed}/${operations.length} operations failed`);
      }
    }

    this.isProcessing = false;

    // If more operations were added while processing, flush again
    if (this.queue.length > 0) {
      this.scheduleFlush();
    }
  }

  /**
   * Force flush all pending operations immediately
   */
  async flushNow(): Promise<void> {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    pending: number;
    totalOperations: number;
    totalBatches: number;
    totalErrors: number;
  } {
    return {
      pending: this.queue.length,
      ...this.stats,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalOperations: 0,
      totalBatches: 0,
      totalErrors: 0,
    };
  }
}

// Singleton instance for packet logging (high volume)
export const packetWriteQueue = new WriteQueue({
  batchSize: 50,
  flushInterval: 250,
  debug: false,
});

// Singleton instance for general writes (lower volume, more important)
export const generalWriteQueue = new WriteQueue({
  batchSize: 20,
  flushInterval: 50,
  debug: false,
});

export { WriteQueue };
