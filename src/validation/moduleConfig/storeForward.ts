import { z } from "zod/v4";

export const StoreForwardValidationSchema = z.object({
  enabled: z.boolean(),
  heartbeat: z.boolean(),
  records: z.int(),
  historyReturnMax: z.int(),
  historyReturnWindow: z.int(),
});

export type StoreForwardValidation = z.infer<
  typeof StoreForwardValidationSchema
>;
