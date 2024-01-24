import type { Message } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/js";
import { IsArray, IsBoolean, IsEnum, IsInt, Max, Min } from "class-validator";

export class LoRaValidation
  implements Omit<Protobuf.Config.Config_LoRaConfig, keyof Message>
{
  @IsBoolean()
  usePreset: boolean;

  @IsEnum(Protobuf.Config.Config_LoRaConfig_ModemPreset)
  modemPreset: Protobuf.Config.Config_LoRaConfig_ModemPreset;

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

  @IsEnum(Protobuf.Config.Config_LoRaConfig_RegionCode)
  region: Protobuf.Config.Config_LoRaConfig_RegionCode;

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

  @IsBoolean()
  ignoreMqtt: boolean;
}
