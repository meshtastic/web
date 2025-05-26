import { z } from "zod/v4";

export const PaxcounterValidationSchema = z.object({
  enabled: z.boolean(),
  paxcounterUpdateInterval: z.int(),
  bleThreshold: z.int(),
  wifiThreshold: z.int(),
});

export type PaxcounterValidation = z.infer<typeof PaxcounterValidationSchema>;
