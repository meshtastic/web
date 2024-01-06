import type { Message } from "@bufbuild/protobuf";
import type { Protobuf } from "@meshtastic/js";
import { IsBoolean, IsInt } from "class-validator";

export class AmbientLightingValidation
  implements
    Omit<
      Protobuf.ModuleConfig.ModuleConfig_AmbientLightingConfig,
      keyof Message
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
