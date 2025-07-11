import { z } from "zod/v4";

export const NeighborInfoValidationSchema = z.object({
  enabled: z.boolean(),
  updateInterval: z.coerce.number().int().min(0),
});

export type NeighborInfoValidation = z.infer<
  typeof NeighborInfoValidationSchema
>;
