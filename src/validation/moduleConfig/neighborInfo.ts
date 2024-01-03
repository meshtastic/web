import { IsBoolean, IsInt } from "class-validator";
import type { Protobuf } from "@meshtastic/js";
import type { Message } from "@bufbuild/protobuf";

export class NeighborInfoValidation
  implements
    Omit<Protobuf.ModuleConfig.ModuleConfig_NeighborInfoConfig, keyof Message>
{
  @IsBoolean()
  enabled: boolean;

  @IsInt()
  updateInterval: number;
}
