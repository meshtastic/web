import { IsInt } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class ExternalNotificationValidation
  implements Protobuf.ModuleConfig_ExternalNotificationConfig
{
  enabled: boolean;

  @IsInt()
  outputMs: number;

  @IsInt()
  output: number;

  active: boolean;

  alertMessage: boolean;

  alertBell: boolean;
}
