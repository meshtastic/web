import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/sdk";
import { describe, expect, it } from "vitest";
import {
  type PowerValidation,
  toPowerConfig,
  toPowerFormValues,
} from "./power.ts";

const power = (adcMultiplierOverride: number) =>
  create(Protobuf.Config.Config_PowerConfigSchema, { adcMultiplierOverride });

describe("ADC multiplier override switch", () => {
  it("is on while the ratio is above 0", () => {
    expect(toPowerFormValues(power(0)).adcOverrideEnabled).toBe(false);
    expect(toPowerFormValues(power(2.5)).adcOverrideEnabled).toBe(true);
    expect(toPowerFormValues(undefined).adcOverrideEnabled).toBe(false);
  });

  it("writes the ratio while on and 0 when off, without the switch", () => {
    const values = toPowerFormValues(power(2.5));
    expect(toPowerConfig(values)).not.toHaveProperty("adcOverrideEnabled");
    expect(toPowerConfig(values).adcMultiplierOverride).toBe(2.5);
    const off: PowerValidation = { ...values, adcOverrideEnabled: false };
    expect(toPowerConfig(off).adcMultiplierOverride).toBe(0);
  });
});
