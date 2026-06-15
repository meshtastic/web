import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import type { TelemetryReading } from "@meshtastic/sdk";
import { beforeEach, describe, expect, it } from "vitest";
import type { SqlocalDb } from "../db.ts";
import { createMemoryDb } from "../testing/createMemoryDb.ts";
import { SqlocalTelemetryRepository } from "./SqlocalTelemetryRepository.ts";

function reading(nodeNum: number, ms: number, battery = 80): TelemetryReading {
  return {
    nodeNum,
    time: new Date(ms),
    kind: "deviceMetrics",
    value: create(Protobuf.Telemetry.DeviceMetricsSchema, { batteryLevel: battery }),
  };
}

describe("SqlocalTelemetryRepository", () => {
  let db: SqlocalDb;
  let repo: SqlocalTelemetryRepository;

  beforeEach(async () => {
    db = await createMemoryDb();
    repo = new SqlocalTelemetryRepository(db, { deviceId: 1 });
  });

  it("appends and loads recent readings ordered ascending", async () => {
    await repo.append(reading(100, 1000, 90));
    await repo.append(reading(100, 2000, 80));
    await repo.append(reading(100, 3000, 70));

    const out = await repo.loadRecent(100, 10);
    expect(out.map((r) => r.time.getTime())).toEqual([1000, 2000, 3000]);
    expect((out[2]?.value as { batteryLevel?: number } | undefined)?.batteryLevel).toBe(70);
  });

  it("loadBefore returns rows older than the cursor in ascending order", async () => {
    await repo.appendBatch([
      reading(100, 1000),
      reading(100, 2000),
      reading(100, 3000),
      reading(100, 4000),
    ]);

    const out = await repo.loadBefore(100, new Date(3000), 10);
    expect(out.map((r) => r.time.getTime())).toEqual([1000, 2000]);
  });

  it("scopes by deviceId — different repos see only their own rows", async () => {
    const repo2 = new SqlocalTelemetryRepository(db, { deviceId: 2 });
    await repo.append(reading(50, 1000));
    await repo2.append(reading(50, 1000));

    expect(await repo.loadRecent(50, 10)).toHaveLength(1);
    expect(await repo2.loadRecent(50, 10)).toHaveLength(1);

    await repo.clearNode(50);
    expect(await repo.loadRecent(50, 10)).toHaveLength(0);
    expect(await repo2.loadRecent(50, 10)).toHaveLength(1);
  });

  it("prune trims per-node history to maxPerNode", async () => {
    for (let i = 0; i < 20; i++) {
      await repo.append(reading(7, (i + 1) * 1000));
    }
    await repo.prune({ maxPerNode: 5 });
    const remaining = await repo.loadRecent(7, 100);
    expect(remaining).toHaveLength(5);
    // The 5 newest entries kept (16k..20k)
    expect(remaining[0]?.time.getTime()).toBe(16_000);
    expect(remaining[4]?.time.getTime()).toBe(20_000);
  });

  it("prune drops readings older than olderThanMs", async () => {
    await repo.append(reading(7, Date.now() - 10_000_000));
    await repo.append(reading(7, Date.now() - 1000));
    await repo.prune({ olderThanMs: 5_000_000 });
    expect(await repo.loadRecent(7, 100)).toHaveLength(1);
  });

  it("preserves the proto payload across save + load", async () => {
    const value = create(Protobuf.Telemetry.DeviceMetricsSchema, {
      batteryLevel: 73,
      voltage: 4.1,
    });
    await repo.append({
      nodeNum: 9,
      time: new Date(123_456),
      kind: "deviceMetrics",
      value,
    });
    const out = await repo.loadRecent(9, 1);
    const v = out[0]?.value as { batteryLevel?: number; voltage?: number } | undefined;
    expect(v?.batteryLevel).toBe(73);
    expect(v?.voltage).toBeCloseTo(4.1);
  });
});
