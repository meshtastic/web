import { describe, expect, it } from "vitest";
import {
  fanOutOffsetsPx,
  groupByIdenticalCoords,
  hashToAngle,
  makeClusterKey,
} from "./cluster.ts";
import {
  derivePins,
  nodeAtLngLat,
  PIN_LABEL_MIN_ZOOM,
  pinLabelsAtZoom,
  showPinLabel,
} from "./mapPins.ts";

import type { LngLat } from "@core/utils/geo.ts";

interface TestNode {
  num: number;
  lngLat?: LngLat;
}

const unplaced: TestNode = { num: 4 };
const nodes: TestNode[] = [
  { num: 1, lngLat: [10, 20] },
  { num: 2, lngLat: [10, 20] },
  { num: 3, lngLat: [11, 21] },
  unplaced,
];

describe("cluster helpers", () => {
  it("groups by key, skipping items without one", () => {
    const groups = groupByIdenticalCoords(nodes, (node) =>
      node.lngLat ? makeClusterKey(node.lngLat) : undefined,
    );
    expect([...groups.keys()]).toEqual(["10,20", "11,21"]);
    expect(groups.get("10,20")?.map((n) => n.num)).toEqual([1, 2]);
  });

  it("fans a stack into a ring, one offset per member", () => {
    expect(fanOutOffsetsPx(0, "k")).toEqual([]);
    expect(fanOutOffsetsPx(1, "k")).toEqual([[0, 0]]);
    const ring = fanOutOffsetsPx(4, "k");
    expect(ring).toHaveLength(4);
    for (const [dx, dy] of ring) {
      expect(Math.hypot(dx, dy)).toBeCloseTo(30);
    }
  });

  it("hashes keys to a stable angle", () => {
    expect(hashToAngle("k")).toBe(hashToAngle("k"));
    expect(hashToAngle("k")).toBeGreaterThanOrEqual(0);
    expect(hashToAngle("k")).toBeLessThan(2 * Math.PI);
  });
});

describe("derivePins", () => {
  it("draws one pin per collapsed stack plus a badge for the hidden ones", () => {
    const model = derivePins(nodes);
    expect(model.pins.map((p) => p.num)).toEqual([1, 3]);
    expect(model.stacks).toEqual([
      { clusterKey: "10,20", lngLat: [10, 20], hiddenCount: 1 },
    ]);
  });

  it("keeps the selected node on top of its stack and draws it last", () => {
    const model = derivePins(nodes, { selectedNum: 2 });
    expect(model.pins.map((p) => p.num)).toEqual([3, 2]);
    expect(model.pins.at(-1)?.tone).toBe("selected");
  });

  it("prefers this device as the top of a stack", () => {
    const model = derivePins(nodes, { myNodeNum: 2 });
    expect(model.pins[0]?.num).toBe(2);
    expect(model.pins[0]?.tone).toBe("self");
    expect(model.pins[0]?.isSelf).toBe(true);
  });

  it("fans out an expanded stack and drops its badge", () => {
    const model = derivePins(nodes, { expandedCluster: "10,20" });
    const stacked = model.pins.filter((p) => p.clusterKey === "10,20");
    expect(stacked.map((p) => p.num)).toEqual([1, 2]);
    expect(stacked[0]?.offsetPx).not.toEqual(stacked[1]?.offsetPx);
    expect(model.stacks).toEqual([]);
  });

  it("draws a node listed twice only once", () => {
    const model = derivePins([...nodes, { num: 3, lngLat: [11, 21] }]);
    expect(model.pins.filter((p) => p.num === 3)).toHaveLength(1);
  });

  it("skips nodes without a position", () => {
    expect(derivePins([unplaced]).pins).toEqual([]);
  });
});

describe("showPinLabel", () => {
  const [pin] = derivePins(nodes).pins;

  it("shows names once zoomed in", () => {
    if (!pin) throw new Error("no pin");
    expect(pinLabelsAtZoom(PIN_LABEL_MIN_ZOOM - 1)).toBe(false);
    expect(pinLabelsAtZoom(PIN_LABEL_MIN_ZOOM)).toBe(true);
    expect(showPinLabel(pin, false)).toBe(false);
    expect(showPinLabel(pin, true)).toBe(true);
  });

  it("always names the selected pin and this device", () => {
    if (!pin) throw new Error("no pin");
    expect(showPinLabel({ ...pin, isSelected: true }, false)).toBe(true);
    expect(showPinLabel({ ...pin, isSelf: true }, false)).toBe(true);
  });
});

describe("nodeAtLngLat", () => {
  it("finds the first node at a point within tolerance", () => {
    expect(nodeAtLngLat(nodes, [10.0000001, 20])?.num).toBe(1);
    expect(nodeAtLngLat(nodes, [12, 20])).toBeUndefined();
  });
});
