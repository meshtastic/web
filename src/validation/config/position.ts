import { IsBoolean, IsInt, IsNumber } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class PositionValidation
  implements Omit<Protobuf.Config_PositionConfig, keyof Protobuf.native.Message>
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
}
