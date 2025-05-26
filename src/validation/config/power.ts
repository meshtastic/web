import { z } from "zod/v4";

export const PowerValidationSchema = z.object({
  isPowerSaving: z.boolean(),
  onBatteryShutdownAfterSecs: z.int(),
  adcMultiplierOverride: z.number().min(2).max(4),
  waitBluetoothSecs: z.int(),
  sdsSecs: z.int(),
  lsSecs: z.int(),
  minWakeSecs: z.int(),
  deviceBatteryInaAddress: z.int(),
});

export type PowerValidation = z.infer<typeof PowerValidationSchema>;
