import type { Message } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/js";
import { IsArray, IsBoolean, IsEnum, IsInt } from "class-validator";

export class PositionValidation
  implements Omit<Protobuf.Config.Config_PositionConfig, keyof Message>
{
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

  @IsInt()
  broadcastSmartMinimumDistance: number;

  @IsInt()
  broadcastSmartMinimumIntervalSecs: number;

  @IsInt()
  gpsEnGpio: number;

  @IsEnum(Protobuf.Config.Config_PositionConfig_GpsMode)
  gpsMode: Protobuf.Config.Config_PositionConfig_GpsMode;

  @IsArray()
  channelPrecision: number[];
}
