import type { Message } from "@bufbuild/protobuf";
import type { Protobuf } from "@meshtastic/js";
import { IsBoolean, IsInt } from "class-validator";

export class ExternalNotificationValidation
  implements
    Omit<
      Protobuf.ModuleConfig.ModuleConfig_ExternalNotificationConfig,
      keyof Message
    >
{
  @IsBoolean()
  enabled: boolean;

  @IsInt()
  outputMs: number;

  @IsInt()
  output: number;

  @IsInt()
  outputVibra: number;

  @IsInt()
  outputBuzzer: number;

  @IsBoolean()
  active: boolean;

  @IsBoolean()
  alertMessage: boolean;

  @IsBoolean()
  alertMessageVibra: boolean;

  @IsBoolean()
  alertMessageBuzzer: boolean;

  @IsBoolean()
  alertBell: boolean;

  @IsBoolean()
  alertBellVibra: boolean;

  @IsBoolean()
  alertBellBuzzer: boolean;

  @IsBoolean()
  usePwm: boolean;

  @IsInt()
  nagTimeout: number;

  @IsBoolean()
  useI2sAsBuzzer: boolean;
}
