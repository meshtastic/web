import { z } from "zod/v4";

export const NeighborInfoValidationSchema = z.object({
  enabled: z.boolean(),
  updateInterval: z.int(),
});

export type NeighborInfoValidation = z.infer<
  typeof NeighborInfoValidationSchema
>;
