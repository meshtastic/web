import { z } from "zod/v4";

export const ScriptingValidationSchema = z.object({
  enabled: z.boolean().default(true),
});

export type ScriptingValidation = z.infer<typeof ScriptingValidationSchema>;
