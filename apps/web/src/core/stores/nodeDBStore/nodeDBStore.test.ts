import { create } from "@bufbuild/protobuf";
import { Protobuf, type Types } from "@meshtastic/core";
import { describe, expect, it, vi } from "vitest";

const idbMem = new Map<string, string>();
vi.mock("idb-keyval", () => ({
  get: vi.fn((key: string) => Promise.resolve(idbMem.get(key))),
  set: vi.fn((key: string, val: string) => {
    idbMem.set(key, val);
    return Promise.resolve();
  }),
  del: vi.fn((k: string) => {
    idbMem.delete(k);
    return Promise.resolve();
  }),
}));

// Load a fresh, non-persisting copy of the nodeDB store.
async function freshNodeDB() {
  vi.resetModules();
  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});

  vi.doMock("@core/services/featureFlags", () => ({
    featureFlags: { get: vi.fn(() => false) },
  }));

  const { useNodeDBStore } = await import("./index.ts");
  return useNodeDBStore;
}

function metricsPacket(
  from: number,
  data: Protobuf.Telemetry.DeviceMetrics,
): Types.PacketMetadata<Protobuf.Telemetry.DeviceMetrics> {
  return { id: 1, rxTime: new Date(), type: "broadcast", from, to: 0, channel: 0, data };
}

describe("nodeDBStore – addDeviceMetrics", () => {
  it("folds live device metrics into an existing node", async () => {
    const useNodeDBStore = await freshNodeDB();
    const db = useNodeDBStore.getState().addNodeDB(1);
    db.addNode(create(Protobuf.Mesh.NodeInfoSchema, { num: 5 }));

    db.addDeviceMetrics(
      metricsPacket(
        5,
        create(Protobuf.Telemetry.DeviceMetricsSchema, { batteryLevel: 80, voltage: 4.1 }),
      ),
    );

    expect(db.getNode(5)?.deviceMetrics?.batteryLevel).toBe(80);
    expect(db.getNode(5)?.deviceMetrics?.voltage).toBeCloseTo(4.1);
  });

  it("ignores metrics for an unknown node (no phantom node is created)", async () => {
    const useNodeDBStore = await freshNodeDB();
    const db = useNodeDBStore.getState().addNodeDB(1);

    db.addDeviceMetrics(
      metricsPacket(999, create(Protobuf.Telemetry.DeviceMetricsSchema, { batteryLevel: 50 })),
    );

    expect(db.getNode(999)).toBeUndefined();
    expect(db.getNodesLength()).toBe(0);
  });
});
