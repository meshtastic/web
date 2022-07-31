import { IsBoolean, IsInt } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class TelemetryValidation
  implements Protobuf.ModuleConfig_TelemetryConfig
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
}
