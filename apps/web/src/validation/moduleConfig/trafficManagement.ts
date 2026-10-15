import { z } from "zod/v4";

// Each setting is off at 0: protobufs 2.8.0 removed the separate bool toggles
// in favour of "non-zero implies enabled".
export const TrafficManagementValidationSchema = z.object({
  positionMinIntervalSecs: z.coerce.number().int().min(0),
  nodeinfoDirectResponseMaxHops: z.coerce.number().int().min(0).max(7),
  rateLimitWindowSecs: z.coerce.number().int().min(0),
  rateLimitMaxPackets: z.coerce.number().int().min(0),
  unknownPacketThreshold: z.coerce.number().int().min(0),
});

export type TrafficManagementValidation = z.infer<
  typeof TrafficManagementValidationSchema
>;
