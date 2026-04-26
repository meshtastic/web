import { describe, expect, it } from "vitest";
import type { TelemetryReading } from "../../domain/TelemetryReading.ts";
import { InMemoryTelemetryRepository } from "./InMemoryTelemetryRepository.ts";

const reading = (nodeNum: number, ms: number): TelemetryReading => ({
  nodeNum,
  time: new Date(ms),
  kind: "deviceMetrics",
  value: { batteryLevel: 50 } as TelemetryReading["value"],
});

describe("InMemoryTelemetryRepository", () => {
  it("appends and loads recent readings per node", async () => {
    const repo = new InMemoryTelemetryRepository();
    await repo.append(reading(1, 1000));
    await repo.append(reading(1, 2000));
    await repo.append(reading(2, 1500));

    expect(await repo.loadRecent(1, 10)).toHaveLength(2);
    expect(await repo.loadRecent(2, 10)).toHaveLength(1);
    expect(await repo.loadRecent(99, 10)).toHaveLength(0);
  });

  it("loadBefore returns the limit of readings before the cursor", async () => {
    const repo = new InMemoryTelemetryRepository();
    await repo.appendBatch([
      reading(1, 1000),
      reading(1, 2000),
      reading(1, 3000),
      reading(1, 4000),
    ]);

    const result = await repo.loadBefore(1, new Date(3000), 2);
    expect(result.map((r) => r.time.getTime())).toEqual([1000, 2000]);
  });

  it("prune drops readings older than olderThanMs", async () => {
    const repo = new InMemoryTelemetryRepository();
    await repo.appendBatch([reading(1, Date.now() - 10_000_000), reading(1, Date.now() - 1_000)]);
    await repo.prune({ olderThanMs: 5_000_000 });
    const remaining = await repo.loadRecent(1, 10);
    expect(remaining).toHaveLength(1);
  });

  it("prune trims per-node history to maxPerNode", async () => {
    const repo = new InMemoryTelemetryRepository();
    for (let i = 0; i < 50; i++) {
      await repo.append(reading(1, i * 1000));
    }
    await repo.prune({ maxPerNode: 10 });
    expect(await repo.loadRecent(1, 100)).toHaveLength(10);
  });

  it("clearNode removes only the named node", async () => {
    const repo = new InMemoryTelemetryRepository();
    await repo.append(reading(1, 1000));
    await repo.append(reading(2, 1000));
    await repo.clearNode(1);
    expect(await repo.loadRecent(1, 10)).toHaveLength(0);
    expect(await repo.loadRecent(2, 10)).toHaveLength(1);
  });
});
