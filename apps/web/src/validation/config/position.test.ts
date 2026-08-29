import { describe, expect, it } from "vitest";
import { PositionValidationSchema } from "./position.ts";

const validBase = {
  positionBroadcastSecs: 0,
  positionBroadcastSmartEnabled: false,
  fixedPosition: false,
  gpsUpdateInterval: 0,
  positionFlags: 0,
  rxGpio: 0,
  txGpio: 0,
  broadcastSmartMinimumDistance: 0,
  broadcastSmartMinimumIntervalSecs: 0,
  gpsEnGpio: 0,
  gpsMode: 0,
};

describe("PositionValidationSchema", () => {
  it("accepts positive latitude and longitude with 7 decimal places", () => {
    const result = PositionValidationSchema.safeParse({
      ...validBase,
      latitude: 34.1147648,
      longitude: 28.3166667,
    });
    expect(result.success).toBe(true);
  });

  it("accepts negative latitude and longitude with 7 decimal places", () => {
    const result = PositionValidationSchema.safeParse({
      ...validBase,
      latitude: -34.1147648,
      longitude: -122.4194165,
    });
    expect(result.success).toBe(true);
  });

  it("rejects latitude with more than 7 decimal places", () => {
    const result = PositionValidationSchema.safeParse({
      ...validBase,
      latitude: -34.11476481,
    });
    expect(result.success).toBe(false);
  });

  it("rejects longitude with more than 7 decimal places", () => {
    const result = PositionValidationSchema.safeParse({
      ...validBase,
      longitude: -122.41941654,
    });
    expect(result.success).toBe(false);
  });

  it("rejects latitude with more than 7 decimal places in exponential notation", () => {
    const result = PositionValidationSchema.safeParse({
      ...validBase,
      latitude: 1.2e-7,
    });
    expect(result.success).toBe(false);
  });

  it("accepts latitude with exactly 7 decimal places in exponential notation", () => {
    const result = PositionValidationSchema.safeParse({
      ...validBase,
      latitude: 1e-7,
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ["latitude", 91],
    ["latitude", -91],
    ["longitude", 181],
    ["longitude", -181],
  ])("rejects %s outside the valid range (%d)", (field, value) => {
    const result = PositionValidationSchema.safeParse({
      ...validBase,
      [field]: value,
    });
    expect(result.success).toBe(false);
  });

  it.each([
    ["latitude", 90],
    ["latitude", -90],
    ["longitude", 180],
    ["longitude", -180],
  ])("accepts %s at the inclusive boundary (%d)", (field, value) => {
    const result = PositionValidationSchema.safeParse({
      ...validBase,
      [field]: value,
    });
    expect(result.success).toBe(true);
  });

  it("treats empty string coordinates as undefined instead of 0", () => {
    const result = PositionValidationSchema.safeParse({
      ...validBase,
      latitude: "",
      longitude: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.latitude).toBeUndefined();
      expect(result.data.longitude).toBeUndefined();
    }
  });
});
