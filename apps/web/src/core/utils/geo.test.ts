import {
  feetToMeters,
  METERS_PER_FOOT,
  metersToFeet,
} from "@core/utils/geo.ts";
import { describe, expect, it } from "vitest";

// Regression test for meshtastic/web#1051:
// The fixed-position altitude field is labelled "Feet" when the display units
// are Imperial, but the firmware stores altitude as an integer number of
// meters. The value entered in feet must be converted to meters before it is
// written to the protobuf.
describe("altitude unit conversion (geo)", () => {
  it("uses the exact meters-per-foot factor", () => {
    expect(METERS_PER_FOOT).toBe(0.3048);
  });

  it("converts feet to meters", () => {
    expect(feetToMeters(1025)).toBeCloseTo(312.42, 2);
    expect(feetToMeters(0)).toBe(0);
  });

  it("converts meters to feet", () => {
    expect(metersToFeet(312)).toBeCloseTo(1023.62, 2);
  });

  it("stores 1025 ft as 312 m (rounded to int32 meters) — issue #1051", () => {
    // A user entering 1025 in the feet-labelled field must not store 1025 m.
    expect(Math.round(feetToMeters(1025))).toBe(312);
  });

  it("round-trips back to the ~1024 ft the reporter observed", () => {
    expect(Math.round(metersToFeet(312))).toBe(1024);
  });
});
