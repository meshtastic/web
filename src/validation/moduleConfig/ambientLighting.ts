import { z } from "zod/v4";

export const AmbientLightingValidationSchema = z.object({
  ledState: z.boolean(),
  current: z.coerce.number().int().min(0),
  red: z.coerce.number().int().min(0).max(255),
  green: z.coerce.number().int().min(0).max(255),
  blue: z.coerce.number().int().min(0).max(255),
});

export type AmbientLightingValidation = z.infer<
  typeof AmbientLightingValidationSchema
>;
