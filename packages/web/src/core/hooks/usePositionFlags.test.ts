import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  FLAGS_CONFIG,
  type FlagName,
  usePositionFlags,
} from "./usePositionFlags.ts";

describe("usePositionFlags", () => {
  it("should initialize with default value 0", () => {
    const { result } = renderHook(() => usePositionFlags());
    expect(result.current.flagsValue).toBe(0);
    expect(result.current.activeFlags).toEqual(["UNSET"]);
  });

  it("should initialize with provided value", () => {
    // 3 = 1 (ALTITUDE) | 2 (ALTITUDE_MSL)
    const { result } = renderHook(() => usePositionFlags(3));
    expect(result.current.flagsValue).toBe(3);
    expect(result.current.activeFlags).toContain("ALTITUDE");
    expect(result.current.activeFlags).toContain("ALTITUDE_MSL");
  });

  it("should toggle a flag", () => {
    const { result } = renderHook(() => usePositionFlags(0));

    act(() => {
      result.current.toggleFlag("ALTITUDE");
    });
    expect(result.current.flagsValue).toBe(FLAGS_CONFIG.ALTITUDE.value);
    expect(result.current.activeFlags).toContain("ALTITUDE");

    act(() => {
      result.current.toggleFlag("ALTITUDE");
    });
    expect(result.current.flagsValue).toBe(0);
  });

  it("should set a flag explicitly", () => {
    const { result } = renderHook(() => usePositionFlags(0));

    act(() => {
      result.current.setFlag("DOP", true);
    });
    expect(result.current.flagsValue).toBe(FLAGS_CONFIG.DOP.value);

    act(() => {
      result.current.setFlag("DOP", false);
    });
    expect(result.current.flagsValue).toBe(0);
  });

  it("should set all flags from integer value", () => {
    const { result } = renderHook(() => usePositionFlags());
    const val = FLAGS_CONFIG.ALTITUDE.value | FLAGS_CONFIG.TIMESTAMP.value;

    act(() => {
      result.current.setFlags(val);
    });
    expect(result.current.flagsValue).toBe(val);
    expect(result.current.activeFlags).toContain("ALTITUDE");
    expect(result.current.activeFlags).toContain("TIMESTAMP");
  });

  it("should clear all flags", () => {
    const { result } = renderHook(() => usePositionFlags(123));

    act(() => {
      result.current.clearFlags();
    });
    expect(result.current.flagsValue).toBe(0);
  });

  it("should throw error for invalid value in setFlags", () => {
    const { result } = renderHook(() => usePositionFlags());
    // Max value is sum of all flags. Any bit outside that is invalid?
    // Let's assume -1 is invalid or a very large number.
    // The implementation sums all bitmasks to find max value.

    const maxValue = Object.values(FLAGS_CONFIG).reduce(
      (acc, conf) => acc | conf.value,
      0,
    );
    const invalidValue = maxValue + 100000; // Assuming it doesn't wrap or collide with safe integer limit

    expect(() => {
      act(() => {
        result.current.setFlags(invalidValue);
      });
    }).toThrowError(/Invalid flags value/);
  });

  it("should decode/encode correctly", () => {
    const { result } = renderHook(() => usePositionFlags());
    const { encode, decode } = result.current;

    const flags: FlagName[] = ["ALTITUDE", "VEHICLE_SPEED"];
    const encoded = encode(flags);
    expect(encoded).toBe(
      FLAGS_CONFIG.ALTITUDE.value | FLAGS_CONFIG.VEHICLE_SPEED.value,
    );

    const decoded = decode(encoded);
    expect(decoded).toContain("ALTITUDE");
    expect(decoded).toContain("VEHICLE_SPEED");
    expect(decoded.length).toBe(2);
  });

  it("should handle hasFlag correctly", () => {
    const { result } = renderHook(() =>
      usePositionFlags(FLAGS_CONFIG.ALTITUDE.value),
    );
    expect(result.current.hasFlag(result.current.flagsValue, "ALTITUDE")).toBe(
      true,
    );
    expect(result.current.hasFlag(result.current.flagsValue, "DOP")).toBe(
      false,
    );
  });
});
