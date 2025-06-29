import { describe, expect, it } from "vitest";
import { deepCompareConfig } from "./deepCompareConfig.ts";

describe("deepCompareConfig", () => {
  it("returns true for identical primitives", () => {
    expect(deepCompareConfig(5, 5)).toBe(true);
    expect(deepCompareConfig("foo", "foo")).toBe(true);
    expect(deepCompareConfig(true, true)).toBe(true);
  });

  it("returns false for different primitives", () => {
    expect(deepCompareConfig(5, 6)).toBe(false);
    expect(deepCompareConfig("foo", "bar")).toBe(false);
    expect(deepCompareConfig(true, false)).toBe(false);
  });

  it("handles nulls correctly", () => {
    expect(deepCompareConfig(null, null)).toBe(true);
    expect(deepCompareConfig(null, undefined)).toBe(false);
    expect(deepCompareConfig(null, {})).toBe(false);
  });

  it("allows undefined in working when allowUndefined is true", () => {
    expect(deepCompareConfig({ a: 1 }, { a: undefined }, true)).toBe(true);
    expect(deepCompareConfig([1, 2, 3], [1, undefined, 3], true)).toBe(true);
  });

  it("rejects undefined in working when allowUndefined is false", () => {
    expect(deepCompareConfig({ a: 1 }, { a: undefined }, false)).toBe(false);
  });

  it("compares arrays deeply", () => {
    expect(deepCompareConfig([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(deepCompareConfig([1, [2, 3]], [1, [2, 4]])).toBe(false);
  });

  it("compares objects deeply", () => {
    const existing = { x: 10, y: { z: 20 } };
    const workingEqual = { x: 10, y: { z: 20 } };
    const workingDiff = { x: 10, y: { z: 21 } };

    expect(deepCompareConfig(existing, workingEqual)).toBe(true);
    expect(deepCompareConfig(existing, workingDiff)).toBe(false);
  });

  it("ignores $typeName key in existing", () => {
    const existing = { $typeName: "Test", a: 1 };
    const working = { a: 1 };
    expect(deepCompareConfig(existing, working)).toBe(true);
  });

  it("fails when working has extra keys", () => {
    expect(deepCompareConfig({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("allows working arrays to be shorter if allowUndefined is true", () => {
    expect(deepCompareConfig([1, 2, 3, 4], [1, 2], true)).toBe(true);
    expect(deepCompareConfig([1, 2, 3, 4], [1, 2], false)).toBe(false);
  });
});
