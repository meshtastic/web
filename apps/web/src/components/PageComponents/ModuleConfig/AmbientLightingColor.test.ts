import { describe, expect, it } from "vitest";
import { hexToRgb, rgbToHex } from "./AmbientLightingColor.tsx";

describe("ambient lighting colour", () => {
  it("formats red, green and blue as a colour input value", () => {
    expect(rgbToHex(255, 128, 0)).toBe("#ff8000");
    expect(rgbToHex(0, 0, 0)).toBe("#000000");
  });

  it("clamps and coerces values the fields may hold mid-edit", () => {
    expect(rgbToHex("12", 300, -5)).toBe("#0cff00");
    expect(rgbToHex("", undefined, "x")).toBe("#000000");
  });

  it("reads a colour input value back", () => {
    expect(hexToRgb("#ff8000")).toEqual({ red: 255, green: 128, blue: 0 });
    expect(hexToRgb("nope")).toBeUndefined();
  });
});
