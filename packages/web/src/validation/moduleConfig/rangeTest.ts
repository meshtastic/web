import { z } from "zod/v4";

export const RangeTestValidationSchema = z.object({
  enabled: z.boolean(),
  sender: z.coerce.number().int().min(0),
  save: z.boolean(),
});

export type RangeTestValidation = z.infer<typeof RangeTestValidationSchema>;
