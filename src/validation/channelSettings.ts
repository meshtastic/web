import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  Length
} from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class ChannelSettingsValidation
  implements
    Omit<Protobuf.ChannelSettings, keyof Protobuf.native.Message | "psk">
{
  @IsBoolean()
  enabled: boolean;

  @IsNumber()
  channelNum: number;

  @IsString()
  psk: string;

  @Length(0, 11)
  name: string;

  @IsInt()
  id: number;

  @IsBoolean()
  uplinkEnabled: boolean;

  @IsBoolean()
  downlinkEnabled: boolean;
}
