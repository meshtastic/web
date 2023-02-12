import { IsArray, IsBoolean, IsEnum, IsInt, Max, Min } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class LoRaValidation
  implements Omit<Protobuf.Config_LoRaConfig, keyof Protobuf.native.Message>
{
  @IsBoolean()
  usePreset: boolean;

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
  txEnabled: boolean;

  @IsInt()
  @Min(0)
  txPower: number;

  @IsInt()
  channelNum: number;

  @IsBoolean()
  overrideDutyCycle: boolean;

  @IsBoolean()
  sx126xRxBoostedGain: boolean;

  @IsInt()
  overrideFrequency: number;

  @IsArray()
  ignoreIncoming: number[];
}
