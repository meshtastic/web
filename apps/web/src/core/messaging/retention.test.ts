import { describe, expect, it } from "vitest";
import { INITIAL_PRUNE_SCHEDULE, nextPrune } from "./retention.ts";

const throttle = { everyAppends: 3, everyMs: 1000 };

describe("nextPrune", () => {
  it("prunes on the first append, then every N appends", () => {
    const runs: boolean[] = [];
    let schedule = INITIAL_PRUNE_SCHEDULE;
    for (let i = 0; i < 7; i++) {
      const step = nextPrune(schedule, 0, throttle);
      runs.push(step.prune);
      schedule = step.schedule;
    }
    expect(runs).toEqual([true, false, false, true, false, false, true]);
  });

  it("prunes once enough time has passed", () => {
    const first = nextPrune(INITIAL_PRUNE_SCHEDULE, 0, throttle);
    expect(nextPrune(first.schedule, 999, throttle).prune).toBe(false);
    expect(nextPrune(first.schedule, 1000, throttle)).toEqual({
      prune: true,
      schedule: { appendsSince: 0, lastPrunedAt: 1000 },
    });
  });
});
