import { describe, expect, it } from "vitest";
import {
  clampDetailsWidth,
  DEFAULT_DETAILS_WIDTH,
  detailsWidthForKey,
  MAX_DETAILS_WIDTH,
  maxDetailsWidth,
  MIN_DETAILS_WIDTH,
  parseDetailsWidth,
} from "./detailsWidth.ts";

describe("maxDetailsWidth", () => {
  it("caps at 640px on a wide screen", () => {
    expect(
      maxDetailsWidth({
        viewportWidth: 2560,
        rowWidth: 2488,
        reservedWidth: 300,
      }),
    ).toBe(MAX_DETAILS_WIDTH);
  });

  it("keeps the main column 420px wide", () => {
    // 1440 - 72 rail = 1368; minus the 300px sidebar and 420px main.
    expect(
      maxDetailsWidth({
        viewportWidth: 1440,
        rowWidth: 1368,
        reservedWidth: 300,
      }),
    ).toBe(640);
    expect(
      maxDetailsWidth({
        viewportWidth: 1280,
        rowWidth: 1208,
        reservedWidth: 300,
      }),
    ).toBe(488);
  });

  it("takes no more than half the viewport", () => {
    expect(
      maxDetailsWidth({
        viewportWidth: 1100,
        rowWidth: 1100,
        reservedWidth: 0,
      }),
    ).toBe(550);
  });

  it("never drops below the default the layout always fits", () => {
    expect(
      maxDetailsWidth({
        viewportWidth: 1024,
        rowWidth: 952,
        reservedWidth: 300,
      }),
    ).toBe(DEFAULT_DETAILS_WIDTH);
  });
});

describe("clampDetailsWidth", () => {
  it("holds a width between the minimum and the maximum", () => {
    expect(clampDetailsWidth(100, 500)).toBe(MIN_DETAILS_WIDTH);
    expect(clampDetailsWidth(900, 500)).toBe(500);
    expect(clampDetailsWidth(401.6, 500)).toBe(402);
  });

  it("falls back to the default for a non-number", () => {
    expect(clampDetailsWidth(Number.NaN, 500)).toBe(DEFAULT_DETAILS_WIDTH);
    expect(clampDetailsWidth(Number.POSITIVE_INFINITY, 500)).toBe(
      DEFAULT_DETAILS_WIDTH,
    );
  });
});

describe("parseDetailsWidth", () => {
  it("reads a stored number", () => {
    expect(parseDetailsWidth("420")).toBe(420);
    expect(parseDetailsWidth("420.4")).toBe(420);
  });

  it("ignores nothing stored and anything unusable", () => {
    for (const raw of [null, "", "  ", "wide", "NaN", "Infinity", "-5", "0"]) {
      expect(parseDetailsWidth(raw)).toBeUndefined();
    }
  });
});

describe("detailsWidthForKey", () => {
  const press = (key: string, shiftKey = false) =>
    detailsWidthForKey({ key, shiftKey }, 400, 600);

  it("widens with Left and narrows with Right, 16px or 64px with Shift", () => {
    expect(press("ArrowLeft")).toBe(416);
    expect(press("ArrowRight")).toBe(384);
    expect(press("ArrowLeft", true)).toBe(464);
    expect(press("ArrowRight", true)).toBe(336);
  });

  it("goes to the limits with Home and End, and stops at them", () => {
    expect(press("Home")).toBe(MIN_DETAILS_WIDTH);
    expect(press("End")).toBe(600);
    expect(
      detailsWidthForKey({ key: "ArrowLeft", shiftKey: true }, 590, 600),
    ).toBe(600);
    expect(
      detailsWidthForKey({ key: "ArrowRight", shiftKey: true }, 300, 600),
    ).toBe(MIN_DETAILS_WIDTH);
  });

  it("ignores other keys", () => {
    expect(press("ArrowUp")).toBeUndefined();
    expect(press("a")).toBeUndefined();
  });
});
