import { describe, expect, it, vi } from "vitest";
import { MultiTabCoordinator } from "./MultiTabCoordinator.ts";

describe("MultiTabCoordinator", () => {
  it("falls through acquireLock when navigator.locks is unavailable", async () => {
    const coordinator = new MultiTabCoordinator();
    const handler = vi.fn().mockResolvedValue(42);
    const result = await coordinator.acquireLock("res", handler);
    expect(result).toBe(42);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("subscribe/unsubscribe gates listeners", () => {
    const coordinator = new MultiTabCoordinator();
    const seen: number[] = [];
    const off = coordinator.subscribe(() => seen.push(1));
    off();
    // No real BroadcastChannel here; ensure subscribe returns a callable no-op
    expect(seen).toEqual([]);
  });
});
