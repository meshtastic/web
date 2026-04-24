import { describe, expect, it } from "vitest";
import { EventBus } from "./EventBus.ts";

describe("EventBus", () => {
  it("delivers dispatched payloads to subscribers", () => {
    const bus = new EventBus();
    const received: number[] = [];
    bus.onConfigComplete.subscribe((id) => received.push(id));
    bus.onConfigComplete.dispatch(42);
    bus.onConfigComplete.dispatch(43);
    expect(received).toEqual([42, 43]);
  });

  it("unsubscribe stops future delivery", () => {
    const bus = new EventBus();
    const received: number[] = [];
    const unsub = bus.onConfigComplete.subscribe((id) => received.push(id));
    bus.onConfigComplete.dispatch(1);
    unsub();
    bus.onConfigComplete.dispatch(2);
    expect(received).toEqual([1]);
  });

  it("channels are independent", () => {
    const bus = new EventBus();
    const msgs: string[] = [];
    const heartbeats: Date[] = [];
    bus.onMessagePacket.subscribe((m) => msgs.push(m.data));
    bus.onMeshHeartbeat.subscribe((d) => heartbeats.push(d));
    bus.onMeshHeartbeat.dispatch(new Date(0));
    expect(msgs).toEqual([]);
    expect(heartbeats.length).toBe(1);
  });
});
