import { describe, expect, it } from "vitest";

import { feetToMeters, metersToFeet } from "./unitConversion.ts";

describe("unitConversion", () => {
  it("converts 1 meter to feet", () => {
    expect(metersToFeet(1)).toBeCloseTo(3.28084, 5);
  });

  it("converts 1 foot to meters", () => {
    expect(feetToMeters(1)).toBeCloseTo(0.3048, 5);
  });

  it("round-trips 312m ↔ 1024ft (issue #1051 case)", () => {
    // 312m displayed as feet should be ~1024 ft
    expect(Math.round(metersToFeet(312))).toBe(1024);
    // 1025 ft stored as meters should be ~312m
    expect(Math.round(feetToMeters(1025))).toBe(312);
  });

  it("round-trips within 1 ft for integer meters (firmware int32 loss)", () => {
    for (const m of [0, 100, 312, 1000]) {
      const ft = Math.round(metersToFeet(m));
      const m2 = Math.round(feetToMeters(ft));
      expect(Math.abs(m - m2)).toBeLessThanOrEqual(1);
    }
  });

  it("handles zero", () => {
    expect(metersToFeet(0)).toBe(0);
    expect(feetToMeters(0)).toBe(0);
  });

  it("handles negative (below sea level, e.g., Dead Sea)", () => {
    expect(metersToFeet(-430)).toBeCloseTo(-1410.76, 1);
    expect(feetToMeters(-1410)).toBeCloseTo(-430, 0);
  });
});
