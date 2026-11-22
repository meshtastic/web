import { describe, expect, it } from "vitest";
import {
  countByQuickFilter,
  isNodeQuickFilter,
  matchesNodeSearch,
  matchesQuickFilter,
  toggleQuickFilter,
} from "./nodeFilters.ts";
import { makeRow } from "./testNodes.ts";

const fav = makeRow({ num: 1, longName: "Fav", isFavorite: true });
const recentDirect = makeRow({
  num: 2,
  longName: "Near",
  heardSecondsAgo: 60,
  hopsAway: 0,
});
const placed = makeRow({ num: 3, longName: "Placed", lat: 1, lng: 2 });
const stale = makeRow({ num: 4, longName: "Stale", heardSecondsAgo: 86_400 });

describe("matchesQuickFilter", () => {
  it("all matches everything", () => {
    for (const row of [fav, recentDirect, placed, stale]) {
      expect(matchesQuickFilter(row, "all")).toBe(true);
    }
  });

  it("each chip matches its own rows", () => {
    expect(matchesQuickFilter(fav, "favorites")).toBe(true);
    expect(matchesQuickFilter(placed, "favorites")).toBe(false);
    expect(matchesQuickFilter(recentDirect, "recent")).toBe(true);
    expect(matchesQuickFilter(stale, "recent")).toBe(false);
    expect(matchesQuickFilter(recentDirect, "direct")).toBe(true);
    expect(matchesQuickFilter(stale, "direct")).toBe(false);
    expect(matchesQuickFilter(placed, "hasPosition")).toBe(true);
    expect(matchesQuickFilter(fav, "hasPosition")).toBe(false);
  });
});

describe("toggleQuickFilter", () => {
  it("picks a new chip and returns to all when the active one is picked", () => {
    expect(toggleQuickFilter("all", "favorites")).toBe("favorites");
    expect(toggleQuickFilter("favorites", "favorites")).toBe("all");
    expect(toggleQuickFilter("favorites", "direct")).toBe("direct");
    expect(toggleQuickFilter("all", "all")).toBe("all");
  });
});

describe("isNodeQuickFilter", () => {
  it("narrows known filter names", () => {
    expect(isNodeQuickFilter("recent")).toBe(true);
    expect(isNodeQuickFilter("unread")).toBe(false);
  });
});

describe("matchesNodeSearch", () => {
  const row = makeRow({
    num: 0x71275a97,
    longName: "SovereignNet: Big Hill",
    shortName: "SNBH",
  });

  it("matches everything for an empty query", () => {
    expect(matchesNodeSearch(row, "   ")).toBe(true);
  });

  it("matches long and short names case-insensitively", () => {
    expect(matchesNodeSearch(row, "big hill")).toBe(true);
    expect(matchesNodeSearch(row, "snbh")).toBe(true);
    expect(matchesNodeSearch(row, "valley")).toBe(false);
  });

  it("matches the hex id with or without the bang, and the decimal number", () => {
    expect(matchesNodeSearch(row, "!71275a97")).toBe(true);
    expect(matchesNodeSearch(row, "5A97")).toBe(true);
    expect(matchesNodeSearch(row, String(0x71275a97))).toBe(true);
  });

  it("a lone bang does not match every id", () => {
    expect(matchesNodeSearch(makeRow({ num: 1, longName: "x" }), "!")).toBe(
      false,
    );
  });
});

describe("countByQuickFilter", () => {
  it("counts rows per chip", () => {
    expect(countByQuickFilter([fav, recentDirect, placed, stale])).toEqual({
      all: 4,
      favorites: 1,
      recent: 1,
      direct: 1,
      hasPosition: 1,
    });
  });
});
