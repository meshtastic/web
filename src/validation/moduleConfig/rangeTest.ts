import { IsBoolean, IsInt } from "class-validator";

import type { Protobuf } from "@meshtastic/js";

export class RangeTestValidation
  implements
    Omit<Protobuf.ModuleConfig_RangeTestConfig, keyof Protobuf.native.Message>
{
  @IsBoolean()
  enabled: boolean;

  @IsInt()
  sender: number;

  @IsBoolean()
  save: boolean;
}
