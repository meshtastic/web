import { z } from "zod/v4";

export const TrafficManagementValidationSchema = z.object({
  enabled: z.boolean(),
  positionDedupEnabled: z.boolean(),
  positionPrecisionBits: z.coerce.number().int().min(0).max(32),
  positionMinIntervalSecs: z.coerce.number().int().min(0),
  nodeinfoDirectResponse: z.boolean(),
  nodeinfoDirectResponseMaxHops: z.coerce.number().int().min(0).max(7),
  rateLimitEnabled: z.boolean(),
  rateLimitWindowSecs: z.coerce.number().int().min(0),
  rateLimitMaxPackets: z.coerce.number().int().min(0),
  dropUnknownEnabled: z.boolean(),
  unknownPacketThreshold: z.coerce.number().int().min(0),
  exhaustHopTelemetry: z.boolean(),
  exhaustHopPosition: z.boolean(),
  routerPreserveHops: z.boolean(),
});

export type TrafficManagementValidation = z.infer<
  typeof TrafficManagementValidationSchema
>;
