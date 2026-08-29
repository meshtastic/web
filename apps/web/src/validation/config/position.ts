import { Protobuf } from "@meshtastic/sdk";
import { z } from "zod/v4";

const GpsModeEnum = z.enum(Protobuf.Config.Config_PositionConfig_GpsMode);

const maxDecimalPlaces = (places: number) => (value: number | undefined) => {
  if (value === undefined) return true;
  // Account for exponential notation, e.g. 1.2e-7 has 8 decimal places.
  const [mantissa = "", exponent = "0"] = value.toString().split(/e/i);
  const decimals = mantissa.split(".")[1]?.length ?? 0;
  return decimals - Number(exponent) <= places;
};

// Coerce cleared inputs to undefined so optional coordinates are omitted
// instead of being coerced to 0.
const emptyStringToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

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
  latitude: z.preprocess(
    emptyStringToUndefined,
    z.coerce
      .number()
      .min(-90)
      .max(90)
      .optional()
      .refine(maxDecimalPlaces(7), { message: "Max 7 decimal precision" }),
  ),
  longitude: z.preprocess(
    emptyStringToUndefined,
    z.coerce
      .number()
      .min(-180)
      .max(180)
      .optional()
      .refine(maxDecimalPlaces(7), { message: "Max 7 decimal precision" }),
  ),
  altitude: z.coerce.number().optional(),
});

export type PositionValidation = z.infer<typeof PositionValidationSchema>;
