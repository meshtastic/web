import { describe, expect, it } from "vitest";
import {
  getColorFromNodeNum,
  hexToRgb,
  isLightColor,
  type RGBColor,
  rgbToHex,
} from "./color.ts";

describe("hexToRgb", () => {
  it.each([
    [0x000000, { r: 0, g: 0, b: 0 }],
    [0xffffff, { r: 255, g: 255, b: 255 }],
    [0x123456, { r: 0x12, g: 0x34, b: 0x56 }],
    [0xff8000, { r: 255, g: 128, b: 0 }],
  ])("parses 0x%s correctly", (hex, expected) => {
    expect(hexToRgb(hex)).toEqual(expected);
  });
});

describe("rgbToHex", () => {
  it.each<[RGBColor, number]>([
    [{ r: 0, g: 0, b: 0 }, 0x000000],
    [{ r: 255, g: 255, b: 255 }, 0xffffff],
    [{ r: 0x12, g: 0x34, b: 0x56 }, 0x123456],
    [{ r: 255, g: 128, b: 0 }, 0xff8000],
  ])("packs %j into 0x%s", (rgb, expected) => {
    expect(rgbToHex(rgb)).toBe(expected);
  });

  it("rounds component values before packing", () => {
    expect(rgbToHex({ r: 12.2, g: 12.8, b: 99.5 })).toBe(
      (12 << 16) | (13 << 8) | 100,
    );
  });
});

describe("hexToRgb ⟷ rgbToHex round-trip", () => {
  it("is identity for representative values (masked to 24-bit)", () => {
    const samples = [0, 1, 0x7fffff, 0x800000, 0xffffff, 0x123456, 0x00ff00];
    for (const hex of samples) {
      const rgb = hexToRgb(hex);
      expect(rgbToHex(rgb)).toBe(hex & 0xffffff);
    }
  });

  it("holds for random 24-bit values", () => {
    for (let i = 0; i < 100; i++) {
      const hex = Math.floor(Math.random() * 0x1000000); // 0..0xFFFFFF
      expect(rgbToHex(hexToRgb(hex))).toBe(hex);
    }
  });
});

describe("isLightColor", () => {
  it("detects obvious extremes", () => {
    expect(isLightColor({ r: 255, g: 255, b: 255 })).toBe(true); // white
    expect(isLightColor({ r: 0, g: 0, b: 0 })).toBe(false); // black
  });

  it("respects the 127.5 threshold at boundary", () => {
    // mid-gray 127 → false, 128 → true (given the formula and 127.5 threshold)
    expect(isLightColor({ r: 127, g: 127, b: 127 })).toBe(false);
    expect(isLightColor({ r: 128, g: 128, b: 128 })).toBe(true);
  });
});

describe("getColorFromNodeNum", () => {
  it.each([
    [0x000000, { r: 0, g: 0, b: 0 }],
    [0xffffff, { r: 255, g: 255, b: 255 }],
    [0x123456, { r: 0x12, g: 0x34, b: 0x56 }],
  ])("extracts RGB from lower 24 bits of %s", (nodeNum, expected) => {
    expect(getColorFromNodeNum(nodeNum)).toEqual(expected);
  });

  it("matches hexToRgb when masking to 24 bits", () => {
    const nodeNums = [1127947528, 42, 999999, 0xfeef12, 0xfeedface, -123456];
    for (const n of nodeNums) {
      // JS bitwise ops use signed 32-bit, so mask the lower 24 bits for comparison.
      const masked = n & 0xffffff;
      expect(getColorFromNodeNum(n)).toEqual(hexToRgb(masked));
    }
  });

  it("always yields components within 0..255", () => {
    const color = getColorFromNodeNum(Math.floor(Math.random() * 2 ** 31));
    for (const v of Object.values(color)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    }
  });
});
