import { IsBoolean, IsInt } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class StoreForwardValidation
  implements
    Omit<
      Protobuf.ModuleConfig_StoreForwardConfig,
      keyof Protobuf.native.Message
    >
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
