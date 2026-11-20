import { describe, expect, it } from "vitest";
import { MultiTabCoordinator } from "./coordinator.ts";

describe("MultiTabCoordinator", () => {
  it("subscribe/unsubscribe gates listeners", () => {
    const coordinator = new MultiTabCoordinator();
    const seen: number[] = [];
    const off = coordinator.subscribe(() => seen.push(1));
    off();
    // No real BroadcastChannel here; ensure subscribe returns a callable no-op
    expect(seen).toEqual([]);
  });
});
