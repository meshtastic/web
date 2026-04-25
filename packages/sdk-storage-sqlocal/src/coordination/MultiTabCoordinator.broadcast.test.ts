import { describe, expect, it } from "vitest";
import { MultiTabCoordinator } from "./MultiTabCoordinator.ts";

/**
 * Node 19+ exposes a global BroadcastChannel that respects the WHATWG
 * spec for cross-context messaging. We instantiate two coordinators in
 * the same process to simulate two browser tabs.
 */
describe("MultiTabCoordinator broadcast", () => {
  it("delivers events between two coordinator instances", async () => {
    if (typeof BroadcastChannel === "undefined") {
      console.warn("BroadcastChannel unavailable; skipping cross-tab test");
      return;
    }
    const a = new MultiTabCoordinator();
    const b = new MultiTabCoordinator();
    try {
      const received = new Promise<unknown>((resolve) => {
        b.subscribe((event) => resolve(event));
      });
      a.broadcast({ kind: "messages-changed", deviceId: 1, key: "channel:0" });
      const event = await received;
      expect(event).toEqual({ kind: "messages-changed", deviceId: 1, key: "channel:0" });
    } finally {
      a.close();
      b.close();
    }
  });
});
