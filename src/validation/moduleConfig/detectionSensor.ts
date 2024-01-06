import type { Message } from "@bufbuild/protobuf";
import type { Protobuf } from "@meshtastic/js";
import { IsBoolean, IsInt, Length } from "class-validator";

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
