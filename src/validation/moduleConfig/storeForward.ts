import { IsBoolean, IsInt } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class StoreForwardValidation
  implements Protobuf.ModuleConfig_StoreForwardConfig
{
  @IsBoolean()
  enabled: boolean;

  @IsBoolean()
  heartbeat: boolean;

  @IsInt()
  records: number;

  @IsInt()
  historyReturnMax: number;

  @IsInt()
  historyReturnWindow: number;
}
