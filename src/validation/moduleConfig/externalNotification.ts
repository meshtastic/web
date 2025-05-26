import { z } from "zod/v4";

export const DetectionSensorValidationSchema = z.object({
  enabled: z.boolean(),
  outputMs: z.int(),
  output: z.int(),
  outputVibra: z.int(),
  outputBuzzer: z.int(),
  active: z.boolean(),
  alertMessage: z.boolean(),
  alertMessageVibra: z.boolean(),
  alertMessageBuzzer: z.boolean(),
  alertBell: z.boolean(),
  alertBellVibra: z.boolean(),
  alertBellBuzzer: z.boolean(),
  usePwm: z.boolean(),
  nagTimeout: z.int(),
  useI2sAsBuzzer: z.boolean(),
});

export type DetectionSensorValidation = z.infer<
  typeof DetectionSensorValidationSchema
>;
