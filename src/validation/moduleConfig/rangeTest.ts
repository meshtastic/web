import { IsBoolean, IsInt } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class RangeTestValidation
  implements Protobuf.ModuleConfig_RangeTestConfig
{
  @IsBoolean()
  enabled: boolean;

  @IsInt()
  sender: number;

  @IsBoolean()
  save: boolean;
}
