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

  it("rejects latitude outside the valid range", () => {
    const result = PositionValidationSchema.safeParse({
      ...validBase,
      latitude: 91,
    });
    expect(result.success).toBe(false);
  });

  it("rejects longitude outside the valid range", () => {
    const result = PositionValidationSchema.safeParse({
      ...validBase,
      longitude: -181,
    });
    expect(result.success).toBe(false);
  });
});
