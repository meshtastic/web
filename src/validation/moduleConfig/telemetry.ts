import { z } from "zod/v4";

export const StoreForwardValidationSchema = z.object({
  deviceUpdateInterval: z.int(),
  environmentUpdateInterval: z.int(),
  environmentMeasurementEnabled: z.boolean(),
  environmentScreenEnabled: z.boolean(),
  environmentDisplayFahrenheit: z.boolean(),
  airQualityEnabled: z.boolean(),
  airQualityInterval: z.int(),
  powerMeasurementEnabled: z.boolean(),
  powerUpdateInterval: z.int(),
  powerScreenEnabled: z.boolean(),
});

export type StoreForwardValidation = z.infer<
  typeof StoreForwardValidationSchema
>;
