import type { Message } from "@bufbuild/protobuf";
import type { Protobuf } from "@meshtastic/js";
import { IsBoolean, IsInt } from "class-validator";

export class RangeTestValidation
  implements
    Omit<Protobuf.ModuleConfig.ModuleConfig_RangeTestConfig, keyof Message>
{
  @IsBoolean()
  enabled: boolean;

  @IsInt()
  sender: number;

  @IsBoolean()
  save: boolean;
}
