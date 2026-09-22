import { describe, expect, it } from "vitest";
import { mergeStagedValue } from "./configMerge.ts";

describe("mergeStagedValue", () => {
  it("fills in fields the staged value never declared", () => {
    const merged = mergeStagedValue(
      { $typeName: "meshtastic.Config.DeviceConfig", role: 2, buttonGpio: 4 },
      { role: 2 },
    );
    expect(merged).toEqual({ role: 2, buttonGpio: 4 });
  });

  it("never overrides a field the form did send", () => {
    const merged = mergeStagedValue(
      { enabled: true, address: "old", root: "msh", tlsEnabled: true },
      { enabled: false, address: "", tlsEnabled: false },
    );
    // `false` and `""` are real edits, not absences.
    expect(merged).toEqual({
      enabled: false,
      address: "",
      tlsEnabled: false,
      root: "msh",
    });
  });

  it("merges sub-messages field by field", () => {
    const merged = mergeStagedValue(
      {
        moduleSettings: { positionPrecision: 13, isMuted: true },
        psk: new Uint8Array([1]),
      },
      { moduleSettings: { positionPrecision: 32 } },
    );
    expect(merged).toEqual({
      moduleSettings: { positionPrecision: 32, isMuted: true },
      psk: new Uint8Array([1]),
    });
  });

  it("treats arrays and byte fields as values, not as things to merge", () => {
    const merged = mergeStagedValue(
      { ignoreIncoming: [1, 2, 3], psk: new Uint8Array([9, 9]) },
      { ignoreIncoming: [], psk: new Uint8Array([]) },
    );
    // Clearing a list or a key must reach the device.
    expect(merged).toEqual({
      ignoreIncoming: [],
      psk: new Uint8Array([]),
    });
  });

  it("is a no-op when there is no baseline", () => {
    const staged = { enabled: true };
    expect(mergeStagedValue(undefined, staged)).toBe(staged);
    expect(mergeStagedValue({}, staged)).toBe(staged);
  });

  it("is a no-op for a fully materialised protobuf message", () => {
    const staged = {
      $typeName: "meshtastic.Config.DeviceConfig",
      role: 0,
      buttonGpio: 0,
    };
    expect(
      mergeStagedValue(
        { $typeName: "meshtastic.Config.DeviceConfig", role: 2, buttonGpio: 4 },
        staged,
      ),
    ).toBe(staged);
  });

  it("leaves non-object values alone", () => {
    expect(mergeStagedValue({ a: 1 }, undefined)).toBeUndefined();
    expect(mergeStagedValue(5, 7)).toBe(7);
  });
});
