import { z } from "zod/v4";

export const PaxcounterValidationSchema = z.object({
  enabled: z.boolean(),
  paxcounterUpdateInterval: z.coerce.number().int().min(0),
  bleThreshold: z.coerce.number().int(),
  wifiThreshold: z.coerce.number().int(),
});

export type PaxcounterValidation = z.infer<typeof PaxcounterValidationSchema>;
