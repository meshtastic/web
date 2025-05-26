import { z } from "zod/v4";

export const SecurityValidationSchema = z.object({
  adminChannelEnabled: z.boolean(),
  adminKey: z.string().array().length(3),
  bluetoothLoggingEnabled: z.boolean(),
  debugLogApiEnabled: z.boolean(),
  isManaged: z.boolean(),
  privateKey: z.string(),
  publicKey: z.string(),
  serialEnabled: z.boolean(),
});

export type SecurityValidation = z.infer<typeof SecurityValidationSchema>;
