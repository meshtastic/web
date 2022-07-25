import { IsBoolean, IsEnum, IsInt } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

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

  @IsInt()
  environmentReadErrorCountThreshold: number;

  @IsInt()
  environmentRecoveryInterval: number;

  @IsBoolean()
  environmentDisplayFahrenheit: boolean;

  @IsEnum(Protobuf.TelemetrySensorType)
  environmentSensorType: Protobuf.TelemetrySensorType;

  @IsInt()
  environmentSensorPin: number;
}
