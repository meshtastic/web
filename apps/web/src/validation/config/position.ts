import { Protobuf } from "@meshtastic/sdk";
import { z } from "zod/v4";

const GpsModeEnum = z.enum(Protobuf.Config.Config_PositionConfig_GpsMode);

const maxDecimalPlaces = (places: number) => (value: number | undefined) => {
  if (value === undefined) return true;
  const [, decimals] = value.toString().split(".");
  return !decimals || decimals.length <= places;
};

export const PositionValidationSchema = z.object({
  positionBroadcastSecs: z.coerce.number().int().min(0),
  positionBroadcastSmartEnabled: z.boolean(),
  fixedPosition: z.boolean(),
  gpsUpdateInterval: z.coerce.number().int().min(0),
  positionFlags: z.coerce.number().int().min(0),
  rxGpio: z.coerce.number().int().min(0),
  txGpio: z.coerce.number().int().min(0),
  broadcastSmartMinimumDistance: z.coerce.number().int().min(0),
  broadcastSmartMinimumIntervalSecs: z.coerce.number().int().min(0),
  gpsEnGpio: z.coerce.number().int().min(0),
  gpsMode: GpsModeEnum,
  latitude: z.coerce
    .number()
    .min(-90)
    .max(90)
    .optional()
    .refine(maxDecimalPlaces(7), { message: "Max 7 decimal precision" }),
  longitude: z.coerce
    .number()
    .min(-180)
    .max(180)
    .optional()
    .refine(maxDecimalPlaces(7), { message: "Max 7 decimal precision" }),
  altitude: z.coerce.number().optional(),
});

export type PositionValidation = z.infer<typeof PositionValidationSchema>;
