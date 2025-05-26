import { z } from "zod/v4";
import { Protobuf } from "@meshtastic/core";

const GpsModeEnum = z.enum(
  Protobuf.Config.Config_PositionConfig_GpsMode,
);

export const PositionValidationSchema = z.object({
  positionBroadcastSecs: z.int(),
  positionBroadcastSmartEnabled: z.boolean(),
  fixedPosition: z.boolean(),
  gpsUpdateInterval: z.int(),
  positionFlags: z.int(),
  rxGpio: z.int(),
  txGpio: z.int(),
  broadcastSmartMinimumDistance: z.int(),
  broadcastSmartMinimumIntervalSecs: z.int(),
  gpsEnGpio: z.int(),
  gpsMode: GpsModeEnum,
});

export type PositionValidation = z.infer<typeof PositionValidationSchema>;
