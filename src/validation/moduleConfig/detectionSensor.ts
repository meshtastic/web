import { IsBoolean, IsInt, Length } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class DetectionSensorValidation
  implements
    Omit<
      Protobuf.ModuleConfig_DetectionSensorConfig,
      keyof Protobuf.native.Message
    >
{
  @IsBoolean()
  enabled: boolean;

  @IsInt()
  minimumBroadcastSecs: number;

  @IsInt()
  stateBroadcastSecs: number;

  @IsBoolean()
  sendBell: boolean;

  @Length(0, 20)
  name: string;

  @IsInt()
  monitorPin: number;

  @IsBoolean()
  detectionTriggeredHigh: boolean;

  @IsBoolean()
  usePullup: boolean;
}
