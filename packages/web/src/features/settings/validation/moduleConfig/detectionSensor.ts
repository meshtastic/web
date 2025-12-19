import { Protobuf } from "@meshtastic/core";
import { z } from "zod/v4";

const detectionTriggerTypeEnum = z.enum(
  Protobuf.ModuleConfig.ModuleConfig_DetectionSensorConfig_TriggerType,
);

export const DetectionSensorValidationSchema = z.object({
  enabled: z.boolean(),
  minimumBroadcastSecs: z.coerce.number().int().min(0),
  stateBroadcastSecs: z.coerce.number().int().min(0),
  sendBell: z.boolean(),
  name: z.string().min(0).max(20),
  monitorPin: z.coerce.number().int().min(0),
  detectionTriggerType: detectionTriggerTypeEnum,
  usePullup: z.boolean(),
});

export type DetectionSensorValidation = z.infer<
  typeof DetectionSensorValidationSchema
>;
