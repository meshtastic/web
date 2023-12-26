import { IsBoolean, IsInt } from "class-validator";

import type { Protobuf } from "@meshtastic/js";

export class AmbientLightingValidation
  implements
    Omit<
      Protobuf.ModuleConfig_AmbientLightingConfig,
      keyof Protobuf.native.Message
    >
{
  @IsBoolean()
  ledState: boolean;

  @IsInt()
  current: number;

  @IsInt()
  red: number;

  @IsInt()
  green: number;

  @IsInt()
  blue: number;
}
