import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  Length,
} from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class ChannelValidation
  implements Omit<Protobuf.Channel, keyof Protobuf.native.Message | "settings">
{
  @IsNumber()
  index: number;

  settings: Channel_SettingsValidation;

  @IsEnum(Protobuf.Channel_Role)
  role: Protobuf.Channel_Role;
}

export class Channel_SettingsValidation
  implements
    Omit<Protobuf.ChannelSettings, keyof Protobuf.native.Message | "psk">
{
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
