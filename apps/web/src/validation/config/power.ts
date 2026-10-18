import type { Protobuf } from "@meshtastic/sdk";
import { z } from "zod/v4";

export const PowerValidationSchema = z.object({
  isPowerSaving: z.boolean(),
  onBatteryShutdownAfterSecs: z.coerce.number().int().min(0),
  /** Form only: the "ADC multiplier override" switch, on while the ratio is above 0. */
  adcOverrideEnabled: z.boolean(),
  adcMultiplierOverride: z.coerce.number().min(0).max(4),
  waitBluetoothSecs: z.coerce.number().int().min(0),
  sdsSecs: z.coerce.number().int().min(0),
  lsSecs: z.coerce.number().int().min(0),
  minWakeSecs: z.coerce.number().int().min(0),
  deviceBatteryInaAddress: z.coerce.number().int().min(0),
});

export type PowerValidation = z.infer<typeof PowerValidationSchema>;

/** The form's values for a PowerConfig: the override switch is derived from the ratio. */
export function toPowerFormValues(
  cfg: Protobuf.Config.Config_PowerConfig | undefined,
): PowerValidation {
  return {
    ...cfg,
    adcOverrideEnabled: (cfg?.adcMultiplierOverride ?? 0) > 0,
  } as PowerValidation;
}

/**
 * The PowerConfig fields to stage from the form. The switch is not a proto
 * field; turning it off writes a ratio of 0, which disables the override.
 */
export function toPowerConfig({
  adcOverrideEnabled,
  ...rest
}: PowerValidation): Omit<PowerValidation, "adcOverrideEnabled"> {
  return {
    ...rest,
    adcMultiplierOverride: adcOverrideEnabled ? rest.adcMultiplierOverride : 0,
  };
}
