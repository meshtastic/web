import { z } from "zod/v4";

export const PowerValidationSchema = z.object({
  isPowerSaving: z.boolean(),
  onBatteryShutdownAfterSecs: z.coerce.number().int().min(0),
  adcMultiplierOverride: z.coerce.number().min(0).max(4),
  waitBluetoothSecs: z.coerce.number().int().min(0),
  sdsSecs: z.coerce.number().int().min(0),
  lsSecs: z.coerce.number().int().min(0),
  minWakeSecs: z.coerce.number().int().min(0),
  deviceBatteryInaAddress: z.coerce.number().int().min(0),
});

export type PowerValidation = z.infer<typeof PowerValidationSchema>;
