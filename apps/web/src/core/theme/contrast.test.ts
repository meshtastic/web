import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  hexContrastRatio,
  meetsContrast,
  parseHexColor,
  relativeLuminance,
} from "./contrast.ts";

describe("parseHexColor", () => {
  it.each([
    ["#000000", { r: 0, g: 0, b: 0 }],
    ["#FFFFFF", { r: 255, g: 255, b: 255 }],
    ["#67ea94", { r: 0x67, g: 0xea, b: 0x94 }],
    ["#fff", { r: 255, g: 255, b: 255 }],
    ["#1a2", { r: 0x11, g: 0xaa, b: 0x22 }],
  ])("parses %s", (hex, expected) => {
    expect(parseHexColor(hex)).toEqual(expected);
  });

  it.each(["", "000000", "#12345", "#gggggg", "#12345678", "rgb(0,0,0)"])(
    "rejects %j",
    (value) => {
      expect(parseHexColor(value)).toBeUndefined();
    },
  );
});

describe("relativeLuminance", () => {
  it("is 0 for black and 1 for white", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 10);
  });

  it("uses the linear segment for very dark channels", () => {
    // 10/255 = 0.0392 is below the 0.04045 knee: 0.0392 / 12.92.
    expect(relativeLuminance({ r: 10, g: 10, b: 10 })).toBeCloseTo(
      10 / 255 / 12.92,
      10,
    );
  });

  it("weights green most and blue least", () => {
    const red = relativeLuminance({ r: 255, g: 0, b: 0 });
    const green = relativeLuminance({ r: 0, g: 255, b: 0 });
    const blue = relativeLuminance({ r: 0, g: 0, b: 255 });
    expect(red).toBeCloseTo(0.2126, 4);
    expect(green).toBeCloseTo(0.7152, 4);
    expect(blue).toBeCloseTo(0.0722, 4);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for identical colours", () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    expect(contrastRatio(black, white)).toBeCloseTo(21, 10);
    expect(contrastRatio(white, white)).toBe(1);
  });

  it("is symmetric", () => {
    const a = { r: 0x67, g: 0xea, b: 0x94 };
    const b = { r: 0x0b, g: 0x12, b: 0x20 };
    expect(contrastRatio(a, b)).toBe(contrastRatio(b, a));
  });

  it.each([
    // Reference values from the WebAIM contrast checker.
    ["#777777", "#ffffff", 4.48],
    ["#767676", "#ffffff", 4.54],
    ["#64748b", "#ffffff", 4.76],
  ])("%s on %s is %s:1", (fg, bg, expected) => {
    expect(hexContrastRatio(fg, bg)).toBeCloseTo(expected, 2);
  });
});

describe("hexContrastRatio", () => {
  it("returns undefined when either value is not a hex colour", () => {
    expect(hexContrastRatio("#fff", "white")).toBeUndefined();
    expect(hexContrastRatio("nope", "#000")).toBeUndefined();
  });
});

describe("meetsContrast", () => {
  it("does not round up", () => {
    expect(meetsContrast(4.49, 4.5)).toBe(false);
    expect(meetsContrast(4.5, 4.5)).toBe(true);
    expect(meetsContrast(3.01, 3)).toBe(true);
  });
});
