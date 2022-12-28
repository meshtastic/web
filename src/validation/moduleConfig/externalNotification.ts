import { IsBoolean, IsInt } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class ExternalNotificationValidation
  implements Protobuf.ModuleConfig_ExternalNotificationConfig
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
  alertMessageVibra: boolean

  @IsBoolean()
  alertMessageBuzzer: boolean

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
}
