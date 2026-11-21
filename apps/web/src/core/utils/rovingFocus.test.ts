import { describe, expect, it } from "vitest";
import { nextRovingIndex } from "./rovingFocus.ts";

describe("nextRovingIndex", () => {
  it("moves right and left, wrapping", () => {
    expect(nextRovingIndex(0, "ArrowRight", 3)).toBe(1);
    expect(nextRovingIndex(2, "ArrowRight", 3)).toBe(0);
    expect(nextRovingIndex(0, "ArrowLeft", 3)).toBe(2);
  });

  it("jumps with Home and End", () => {
    expect(nextRovingIndex(1, "Home", 5)).toBe(0);
    expect(nextRovingIndex(1, "End", 5)).toBe(4);
  });

  it("ignores keys that are not movement keys", () => {
    expect(nextRovingIndex(1, "Enter", 3)).toBeNull();
    expect(nextRovingIndex(1, "a", 3)).toBeNull();
  });

  it("respects orientation", () => {
    expect(nextRovingIndex(0, "ArrowDown", 3)).toBeNull();
    expect(
      nextRovingIndex(0, "ArrowDown", 3, { orientation: "vertical" }),
    ).toBe(1);
    expect(
      nextRovingIndex(0, "ArrowRight", 3, { orientation: "vertical" }),
    ).toBeNull();
    expect(nextRovingIndex(0, "ArrowUp", 3, { orientation: "both" })).toBe(2);
  });

  it("swaps left and right in RTL", () => {
    expect(nextRovingIndex(0, "ArrowLeft", 3, { dir: "rtl" })).toBe(1);
    expect(nextRovingIndex(0, "ArrowRight", 3, { dir: "rtl" })).toBe(2);
  });

  it("skips disabled items", () => {
    const disabled = new Set([1, 2]);
    expect(nextRovingIndex(0, "ArrowRight", 4, { disabled })).toBe(3);
    expect(nextRovingIndex(3, "ArrowLeft", 4, { disabled })).toBe(0);
    expect(nextRovingIndex(3, "Home", 4, { disabled: new Set([0]) })).toBe(1);
    expect(nextRovingIndex(0, "End", 4, { disabled: new Set([3]) })).toBe(2);
  });

  it("returns null when nothing can take focus", () => {
    expect(nextRovingIndex(0, "ArrowRight", 0)).toBeNull();
    expect(
      nextRovingIndex(0, "ArrowRight", 2, { disabled: new Set([0, 1]) }),
    ).toBeNull();
  });
});
