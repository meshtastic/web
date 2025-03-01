import type { Message } from "@bufbuild/protobuf";
import type { Protobuf } from "@meshtastic/core";
import { IsBoolean, IsInt } from "class-validator";

export class PaxcounterValidation
  implements
    Omit<Protobuf.ModuleConfig.ModuleConfig_PaxcounterConfig, keyof Message> {
  @IsBoolean()
  enabled: boolean;

  @IsInt()
  paxcounterUpdateInterval: number;

  @IsInt()
  bleThreshold: number;

  @IsInt()
  wifiThreshold: number;
}
