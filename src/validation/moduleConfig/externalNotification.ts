import { z } from "zod/v4";

export const ExternalNotificationValidationSchema = z.object({
  enabled: z.boolean(),
  outputMs: z.coerce.number().int().min(0),
  output: z.coerce.number().int().min(0),
  outputVibra: z.coerce.number().int().min(0),
  outputBuzzer: z.coerce.number().int().min(0),
  active: z.boolean(),
  alertMessage: z.boolean(),
  alertMessageVibra: z.boolean(),
  alertMessageBuzzer: z.boolean(),
  alertBell: z.boolean(),
  alertBellVibra: z.boolean(),
  alertBellBuzzer: z.boolean(),
  usePwm: z.boolean(),
  nagTimeout: z.coerce.number().int().min(0),
  useI2sAsBuzzer: z.boolean(),
});

export type ExternalNotificationValidation = z.infer<
  typeof ExternalNotificationValidationSchema
>;
