import { describe, expect, it } from "vitest";
import { initialsScale, initialsWidthEm } from "./avatarFit.ts";

describe("initialsWidthEm", () => {
  it("is wider for wide letters than for narrow ones", () => {
    expect(initialsWidthEm("WWWW")).toBeGreaterThan(initialsWidthEm("SDCH"));
    expect(initialsWidthEm("SDCH")).toBeGreaterThan(initialsWidthEm("BVcl"));
  });

  it("counts an emoji as one wide character", () => {
    expect(initialsWidthEm("👍🏽")).toBe(initialsWidthEm("😀"));
    expect(initialsWidthEm("😀")).toBeGreaterThan(initialsWidthEm("W"));
  });
});

describe("initialsScale", () => {
  it("leaves names that fit at full size", () => {
    expect(initialsScale("SDCH", 3.1)).toBe(1);
    expect(initialsScale("1Q84", 3.1)).toBe(1);
  });

  it("shrinks names that would overflow, but not past the floor", () => {
    const scale = initialsScale("MMMM", 3.1);
    expect(scale).toBeLessThan(1);
    expect(initialsWidthEm("MMMM") * scale).toBeLessThanOrEqual(3.1);
    expect(initialsScale("WWWW", 1)).toBe(0.7);
  });
});
