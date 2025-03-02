import type { Message } from "@bufbuild/protobuf";
import type { Protobuf } from "@meshtastic/core";
import { IsBoolean, IsInt } from "class-validator";

export class StoreForwardValidation implements
  Omit<
    Protobuf.ModuleConfig.ModuleConfig_StoreForwardConfig,
    keyof Message | "isServer"
  > {
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
