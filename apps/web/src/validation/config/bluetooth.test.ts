import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import { BluetoothValidationSchema } from "./bluetooth.ts";

const { FIXED_PIN, RANDOM_PIN, NO_PIN } =
  Protobuf.Config.Config_BluetoothConfig_PairingMode;

describe("BluetoothValidationSchema", () => {
  it.each([RANDOM_PIN, NO_PIN])("accepts PIN 0 in mode %i", (mode) => {
    expect(
      BluetoothValidationSchema.safeParse({ enabled: true, mode, fixedPin: 0 })
        .success,
    ).toBe(true);
  });

  it("accepts a six-digit fixed PIN", () => {
    expect(
      BluetoothValidationSchema.safeParse({
        enabled: true,
        mode: FIXED_PIN,
        fixedPin: 123456,
      }).success,
    ).toBe(true);
  });

  it("rejects a short fixed PIN on the PIN field", () => {
    const result = BluetoothValidationSchema.safeParse({
      enabled: true,
      mode: FIXED_PIN,
      fixedPin: 0,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      code: "too_small",
      origin: "number",
      minimum: 100000,
      path: ["fixedPin"],
    });
  });
});
