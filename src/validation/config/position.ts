import type { Message } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/core";
import { IsBoolean, IsEnum, IsInt } from "class-validator";

const DeprecatedPositionValidationFields = ["gpsEnabled", "gpsAttemptTime"];

export class PositionValidation implements
  Omit<
    Protobuf.Config.Config_PositionConfig,
    keyof Message | (typeof DeprecatedPositionValidationFields)[number]
  > {
  @IsInt()
  positionBroadcastSecs: number;

  @IsBoolean()
  positionBroadcastSmartEnabled: boolean;

  @IsBoolean()
  fixedPosition: boolean;

  @IsInt()
  gpsUpdateInterval: number;

  @IsInt()
  positionFlags: number;

  @IsInt()
  rxGpio: number;

  @IsInt()
  txGpio: number;

  @IsInt()
  broadcastSmartMinimumDistance: number;

  @IsInt()
  broadcastSmartMinimumIntervalSecs: number;

  @IsInt()
  gpsEnGpio: number;

  @IsEnum(Protobuf.Config.Config_PositionConfig_GpsMode)
  gpsMode: Protobuf.Config.Config_PositionConfig_GpsMode;
}
