import { IsBoolean, IsInt } from 'class-validator';

import type { Protobuf } from '@meshtastic/meshtasticjs';

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
}
