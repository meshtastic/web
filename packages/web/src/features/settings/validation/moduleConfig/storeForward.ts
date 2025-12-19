import { z } from "zod/v4";

export const StoreForwardValidationSchema = z.object({
  enabled: z.boolean(),
  heartbeat: z.boolean(),
  records: z.coerce.number().int().min(0),
  historyReturnMax: z.coerce.number().int().min(0),
  historyReturnWindow: z.coerce.number().int().min(0),
});

export type StoreForwardValidation = z.infer<
  typeof StoreForwardValidationSchema
>;
