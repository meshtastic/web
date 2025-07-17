import { z } from "zod/v4";

export const TelemetryValidationSchema = z.object({
  deviceUpdateInterval: z.coerce.number().int().min(0),
  environmentUpdateInterval: z.coerce.number().int().min(0),
  environmentMeasurementEnabled: z.boolean(),
  environmentScreenEnabled: z.boolean(),
  environmentDisplayFahrenheit: z.boolean(),
  airQualityEnabled: z.boolean(),
  airQualityInterval: z.coerce.number().int().min(0),
  powerMeasurementEnabled: z.boolean(),
  powerUpdateInterval: z.coerce.number().int().min(0),
  powerScreenEnabled: z.boolean(),
});

export type TelemetryValidation = z.infer<typeof TelemetryValidationSchema>;
