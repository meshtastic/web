import { IsBoolean, IsInt, IsNumber } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class PositionValidation implements Protobuf.Config_PositionConfig {
  @IsInt()
  positionBroadcastSecs: number;

  @IsBoolean()
  positionBroadcastSmartEnabled: boolean;

  @IsBoolean()
  fixedPosition: boolean;

  @IsBoolean()
  gpsEnabled: boolean;

  @IsInt()
  gpsUpdateInterval: number;

  @IsInt()
  gpsAttemptTime: number;

  @IsInt()
  positionFlags: number;

  @IsInt()
  rxGpio: number;

  @IsInt()
  txGpio: number;

  // fixed position fields
  @IsNumber()
  fixedAlt: number;

  @IsNumber()
  fixedLat: number;

  @IsNumber()
  fixedLng: number;
}
