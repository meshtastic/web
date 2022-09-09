import { IsArray, IsBoolean, IsEnum, IsInt, Max, Min } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class LoRaValidation implements Protobuf.Config_LoRaConfig {
  @IsInt()
  @Min(0)
  @Max(10)
  txPower: number;

  @IsEnum(Protobuf.Config_LoRaConfig_ModemPreset)
  modemPreset: Protobuf.Config_LoRaConfig_ModemPreset;

  @IsInt()
  bandwidth: number;

  @IsInt()
  // @Min(7)
  @Max(12)
  spreadFactor: number;

  @IsInt()
  @Min(0)
  @Max(10)
  codingRate: number;

  @IsInt()
  frequencyOffset: number;

  @IsEnum(Protobuf.Config_LoRaConfig_RegionCode)
  region: Protobuf.Config_LoRaConfig_RegionCode;

  @IsInt()
  @Min(1)
  @Max(7)
  hopLimit: number;

  @IsBoolean()
  txDisabled: boolean;

  @IsArray()
  ignoreIncoming: number[];
}
