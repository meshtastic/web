import { z } from "zod/v4";

export const DetectionSensorValidationSchema = z.object({
  enabled: z.boolean(),
  minimumBroadcastSecs: z.int(),
  stateBroadcastSecs: z.int(),
  sendBell: z.boolean(),
  name: z.string().min(0).max(20),
  monitorPin: z.int(),
  detectionTriggeredHigh: z.boolean(),
  usePullup: z.boolean(),
});

export type DetectionSensorValidation = z.infer<
  typeof DetectionSensorValidationSchema
>;
