import { create } from "@bufbuild/protobuf";
import * as Protobuf from "@meshtastic/protobufs";
import { describe, expect, it } from "vitest";
import { configValuesEqual } from "./configEquality.ts";

describe("configValuesEqual", () => {
  it("treats an absent field as its protobuf default", () => {
    expect(configValuesEqual({ enabled: false }, {})).toBe(true);
    expect(configValuesEqual({ root: "" }, {})).toBe(true);
    expect(configValuesEqual({ publishIntervalSecs: 0 }, {})).toBe(true);
    expect(configValuesEqual({ psk: new Uint8Array() }, {})).toBe(true);
  });

  it("never treats an absent field as a set boolean", () => {
    expect(configValuesEqual({ enabled: true }, {})).toBe(false);
    expect(configValuesEqual({}, { enabled: true })).toBe(false);
  });

  it("detects a boolean flip regardless of which side carries the key", () => {
    expect(configValuesEqual({ enabled: false }, { enabled: true })).toBe(
      false,
    );
    // Key sets differ but have the same size — the old Object.keys(a)-only
    // walk could skip the key that is missing from `a`.
    expect(
      configValuesEqual(
        { address: "m", root: "msh", username: "u" },
        { address: "m", root: "msh", enabled: true },
      ),
    ).toBe(false);
  });

  it("ignores the protobuf $typeName marker", () => {
    const message = create(
      Protobuf.ModuleConfig.ModuleConfig_MQTTConfigSchema,
      { enabled: true, address: "mqtt.example.org" },
    );
    // What a Zod-parsed web form stages: same values, no $typeName, and the
    // untouched zero-valued fields are simply absent.
    expect(
      configValuesEqual(message, {
        enabled: true,
        address: "mqtt.example.org",
      }),
    ).toBe(true);
    expect(
      configValuesEqual(message, {
        enabled: false,
        address: "mqtt.example.org",
      }),
    ).toBe(false);
  });

  it("treats an absent sub-message as an all-defaults sub-message", () => {
    expect(
      configValuesEqual(
        { mapReportSettings: { publishIntervalSecs: 0, positionPrecision: 0 } },
        {},
      ),
    ).toBe(true);
    expect(
      configValuesEqual({ mapReportSettings: { positionPrecision: 13 } }, {}),
    ).toBe(false);
  });

  it("compares bytes and repeated fields by value", () => {
    expect(
      configValuesEqual(
        { psk: new Uint8Array([1, 2, 3]) },
        { psk: new Uint8Array([1, 2, 3]) },
      ),
    ).toBe(true);
    expect(
      configValuesEqual(
        { psk: new Uint8Array([1, 2, 3]) },
        { psk: new Uint8Array([1, 2, 4]) },
      ),
    ).toBe(false);
    expect(configValuesEqual({ list: [1, 2] }, { list: [1, 2] })).toBe(true);
    expect(configValuesEqual({ list: [1, 2] }, { list: [2, 1] })).toBe(false);
  });
});
