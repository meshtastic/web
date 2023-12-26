import { IsBoolean, IsInt, Length } from "class-validator";

import type { Protobuf } from "@meshtastic/js";

export class NeighborInfoValidation
  implements
    Omit<
      Protobuf.ModuleConfig_NeighborInfoConfig,
      keyof Protobuf.native.Message
    >
{
  @IsBoolean()
  enabled: boolean;

  @IsInt()
  updateInterval: number;
}
