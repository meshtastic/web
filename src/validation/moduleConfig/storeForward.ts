import type { Message } from "@bufbuild/protobuf";
import type { Protobuf } from "@meshtastic/js";
import { IsBoolean, IsInt } from "class-validator";

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
