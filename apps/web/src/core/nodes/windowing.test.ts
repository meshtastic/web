import { describe, expect, it } from "vitest";
import { visibleRange } from "./windowing.ts";

describe("visibleRange", () => {
  it("renders nothing for an empty list", () => {
    expect(
      visibleRange({
        count: 0,
        rowHeight: 50,
        scrollTop: 0,
        viewportHeight: 500,
      }),
    ).toEqual({ start: 0, end: 0, padTop: 0, padBottom: 0 });
  });

  it("renders a screenful plus overscan at the top", () => {
    const range = visibleRange({
      count: 1000,
      rowHeight: 50,
      scrollTop: 0,
      viewportHeight: 500,
      overscan: 5,
    });
    expect(range).toEqual({
      start: 0,
      end: 20,
      padTop: 0,
      padBottom: 980 * 50,
    });
  });

  it("follows the scroll position with overscan above", () => {
    const range = visibleRange({
      count: 1000,
      rowHeight: 50,
      scrollTop: 5000,
      viewportHeight: 500,
      overscan: 5,
    });
    expect(range.start).toBe(95);
    expect(range.end).toBe(115);
    expect(range.padTop + range.padBottom).toBe((1000 - 20) * 50);
  });

  it("clamps past the end", () => {
    const range = visibleRange({
      count: 10,
      rowHeight: 50,
      scrollTop: 99_999,
      viewportHeight: 500,
    });
    expect(range.end).toBe(10);
    expect(range.padBottom).toBe(0);
  });

  it("renders an initial batch before the viewport is measured", () => {
    const range = visibleRange({
      count: 1000,
      rowHeight: 50,
      scrollTop: 0,
      viewportHeight: 0,
      overscan: 0,
      initialRows: 30,
    });
    expect(range.end).toBe(30);
  });
});
