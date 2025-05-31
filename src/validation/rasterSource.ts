import { z } from "zod/v4";

export const MapValidation_RasterSourcesSchema = z.object({
  enabled: z.boolean(),
  title: z.string(),
  tiles: z.url(),
  tileSize: z.number(),
});

export const MapValidationSchema = z.object({
  rasterSources: MapValidation_RasterSourcesSchema.array(),
});

export type MapValidation = z.infer<typeof MapValidationSchema>;
