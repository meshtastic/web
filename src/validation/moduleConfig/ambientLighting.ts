import { z } from "zod/v4";

export const AmbientLightingValidationSchema = z.object({
  ledState: z.boolean(),
  current: z.int(),
  red: z.int(),
  green: z.int(),
  blue: z.int(),
});

export type AmbientLightingValidation = z.infer<
  typeof AmbientLightingValidationSchema
>;
