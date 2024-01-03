import { IsBoolean, IsInt, Length } from "class-validator";
import type { Protobuf } from "@meshtastic/js";
import type { Message } from "@bufbuild/protobuf";

export class DetectionSensorValidation
  implements
    Omit<
      Protobuf.ModuleConfig.ModuleConfig_DetectionSensorConfig,
      keyof Message
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
