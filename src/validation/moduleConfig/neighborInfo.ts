import type { Message } from "@bufbuild/protobuf";
import type { Protobuf } from "@meshtastic/js";
import { IsBoolean, IsInt } from "class-validator";

export class NeighborInfoValidation
  implements
    Omit<Protobuf.ModuleConfig.ModuleConfig_NeighborInfoConfig, keyof Message>
{
  @IsBoolean()
  enabled: boolean;

  @IsInt()
  updateInterval: number;
}
