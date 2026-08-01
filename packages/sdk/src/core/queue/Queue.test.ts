import { describe, expect, it, vi } from "vitest";
import { Queue } from "./Queue.ts";

describe("Queue.sendUnacknowledged", () => {
  it("rejects a queued control packet when clear removes it", async () => {
    vi.useFakeTimers();
    const queue = new Queue();
    let finishWrite: (() => void) | undefined;
    const output = new WritableStream<Uint8Array>({
      write: () =>
        new Promise<void>((resolve) => {
          finishWrite = resolve;
        }),
    });

    const activeSend = queue.sendUnacknowledged(
      { id: 1, data: new Uint8Array([1]) },
      output,
    );
    await vi.advanceTimersByTimeAsync(200);

    const queuedSend = queue.sendUnacknowledged(
      { id: 2, data: new Uint8Array([2]) },
      output,
    );
    queue.clear();

    await expect(queuedSend).rejects.toThrow(
      "Packet 2 was cancelled before being sent",
    );

    finishWrite?.();
    await activeSend;
    vi.useRealTimers();
  });
});
