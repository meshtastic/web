import { describe, expect, it } from "vitest";
import {
  DEFAULT_NODE_SORT,
  isNodeSortKey,
  NODE_SORT_INITIAL_DIRECTION,
  NODE_SORT_KEYS,
  sortNodeRows,
} from "./nodeSort.ts";
import { makeNode, makeRow } from "./testNodes.ts";

const rows = [
  makeRow({
    num: 3,
    longName: "charlie",
    heardSecondsAgo: 600,
    hopsAway: 2,
    snr: -12,
    batteryLevel: 40,
  }),
  makeRow({
    num: 1,
    longName: "alpha",
    heardSecondsAgo: 60,
    hopsAway: 0,
    snr: 5,
    batteryLevel: 101,
  }),
  makeRow({ num: 2, longName: "bravo" }),
  makeRow({
    num: 4,
    longName: "delta",
    heardSecondsAgo: 60,
    hopsAway: 1,
    snr: -3,
    batteryLevel: 90,
  }),
];

const nums = (list: { num: number }[]) => list.map((row) => row.num);

describe("sortNodeRows", () => {
  it("defaults to most recently heard first, never heard last, ties by number", () => {
    expect(nums(sortNodeRows(rows, DEFAULT_NODE_SORT))).toEqual([1, 4, 3, 2]);
  });

  it("sorts by hops ascending with unknown hops last", () => {
    expect(nums(sortNodeRows(rows, { key: "hops", direction: "asc" }))).toEqual(
      [1, 4, 3, 2],
    );
  });

  it("sorts by SNR, strongest first", () => {
    expect(nums(sortNodeRows(rows, { key: "snr", direction: "desc" }))).toEqual(
      [1, 4, 3, 2],
    );
  });

  it("sorts plugged-in above any battery level", () => {
    expect(
      nums(sortNodeRows(rows, { key: "battery", direction: "desc" })),
    ).toEqual([1, 4, 3, 2]);
  });

  it("sorts by name", () => {
    expect(
      nums(sortNodeRows(rows, { key: "name", direction: "desc" })),
    ).toEqual([4, 3, 2, 1]);
  });

  it("sorts by distance with unplaced nodes last", () => {
    const myPosition = makeNode({ num: 100, lat: 1, lng: 1 }).position;
    const ctx = { myNodeNum: 100, myPosition };
    const placed = [
      makeRow({ num: 1, lat: 1, lng: 1.2 }, ctx),
      makeRow({ num: 2 }, ctx),
      makeRow({ num: 3, lat: 1, lng: 1.1 }, ctx),
    ];
    expect(
      nums(sortNodeRows(placed, { key: "distance", direction: "asc" })),
    ).toEqual([3, 1, 2]);
  });
});

describe("node sort keys", () => {
  it("every key has an initial direction", () => {
    for (const key of NODE_SORT_KEYS) {
      expect(NODE_SORT_INITIAL_DIRECTION[key]).toMatch(/^(asc|desc)$/u);
    }
  });

  it("narrows strings to sort keys", () => {
    expect(isNodeSortKey("snr")).toBe(true);
    expect(isNodeSortKey("rssi")).toBe(false);
  });
});
