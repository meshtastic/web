import { IsBoolean, IsInt } from "class-validator";
import type { Protobuf } from "@meshtastic/js";
import type { Message } from "@bufbuild/protobuf";

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
