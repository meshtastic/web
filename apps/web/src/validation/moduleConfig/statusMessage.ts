import { z } from "zod/v4";

export const StatusMessageValidationSchema = z.object({
  nodeStatus: z.string().max(200),
});

export type StatusMessageValidation = z.infer<
  typeof StatusMessageValidationSchema
>;
