import { z } from "zod/v4";

export const DetectionSensorValidationSchema = z.object({
  enabled: z.boolean(),
  minimumBroadcastSecs: z.coerce.number().int().min(0),
  stateBroadcastSecs: z.coerce.number().int().min(0),
  sendBell: z.boolean(),
  name: z.string().min(0).max(20),
  monitorPin: z.coerce.number().int().min(0),
  detectionTriggeredHigh: z.boolean(),
  usePullup: z.boolean(),
});

export type DetectionSensorValidation = z.infer<
  typeof DetectionSensorValidationSchema
>;
