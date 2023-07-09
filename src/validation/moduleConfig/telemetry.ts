import { IsBoolean, IsInt } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class TelemetryValidation
  implements
    Omit<Protobuf.ModuleConfig_TelemetryConfig, keyof Protobuf.native.Message>
{
  @IsInt()
  deviceUpdateInterval: number;

  @IsInt()
  environmentUpdateInterval: number;

  @IsBoolean()
  environmentMeasurementEnabled: boolean;

  @IsBoolean()
  environmentScreenEnabled: boolean;

  @IsBoolean()
  environmentDisplayFahrenheit: boolean;

  @IsBoolean()
  airQualityEnabled: boolean;

  @IsInt()
  airQualityInterval: number;
}
