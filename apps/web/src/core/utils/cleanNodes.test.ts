import { create } from "@bufbuild/protobuf";
import { type Node, Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { minDays, nodesToClean } from "./cleanNodes.ts";

const DAY = 24 * 60 * 60;
const NOW = 1_800_000_000;

const node = (num: number, overrides: Partial<Node> = {}): Node => ({
  num,
  isFavorite: false,
  isIgnored: false,
  user: create(Protobuf.Mesh.UserSchema, { longName: `Node ${num}` }),
  lastHeard: NOW - 30 * DAY,
  ...overrides,
});

describe("nodesToClean", () => {
  const criteria = { olderThanDays: 14, onlyUnknown: false, nowSeconds: NOW };

  it("selects nodes last heard before the cut-off", () => {
    const nodes = [
      node(1),
      node(2, { lastHeard: NOW - 3 * DAY }),
      node(3, { lastHeard: undefined }),
    ];
    expect(nodesToClean(nodes, criteria).map((n) => n.num)).toEqual([1, 3]);
  });

  it("keeps our own node, favourites and ignored nodes", () => {
    const nodes = [
      node(1),
      node(2, { isFavorite: true }),
      node(3, { isIgnored: true }),
    ];
    expect(
      nodesToClean(nodes, { ...criteria, myNodeNum: 1 }).map((n) => n.num),
    ).toEqual([]);
  });

  it("can limit to unknown nodes", () => {
    const nodes = [
      node(1),
      node(2, { user: undefined }),
      node(3, { user: create(Protobuf.Mesh.UserSchema, {}) }),
    ];
    expect(
      nodesToClean(nodes, { ...criteria, onlyUnknown: true }).map((n) => n.num),
    ).toEqual([2, 3]);
  });

  it("lets unknown-only cleaning go down to 0 days", () => {
    expect(minDays(true)).toBe(0);
    expect(minDays(false)).toBe(7);
  });
});
