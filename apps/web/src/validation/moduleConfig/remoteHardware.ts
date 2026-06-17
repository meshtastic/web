import { z } from "zod/v4";

export const RemoteHardwareValidationSchema = z.object({
  enabled: z.boolean(),
  allowUndefinedPinAccess: z.boolean(),
  // Preserved untouched: the form does not yet edit the available-pins list,
  // so round-trip it to avoid clearing pins configured elsewhere.
  availablePins: z.array(z.any()),
});

export type RemoteHardwareValidation = z.infer<
  typeof RemoteHardwareValidationSchema
>;
