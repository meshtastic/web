import { IsBoolean, IsInt } from "class-validator";
import type { Protobuf } from "@meshtastic/js";
import type { Message } from "@bufbuild/protobuf";

export class StoreForwardValidation
  implements
    Omit<Protobuf.ModuleConfig.ModuleConfig_StoreForwardConfig, keyof Message>
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
