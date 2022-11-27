import { IsArray, IsBoolean, IsNumber, IsString } from "class-validator";

import type { RasterSource } from "@app/core/stores/appStore.js";

export class MapValidation {
  @IsArray()
  rasterSources: MapValidation_RasterSources[];
}

export class MapValidation_RasterSources implements RasterSource {
  @IsBoolean()
  enabled: boolean;

  @IsString()
  title: string;

  // @IsUrl()
  tiles: string[];

  @IsNumber()
  tileSize: number;
}
