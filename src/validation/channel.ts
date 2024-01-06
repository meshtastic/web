import type { Message } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/js";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  Length,
} from "class-validator";

export class ChannelValidation
  implements Omit<Protobuf.Channel.Channel, keyof Message | "settings">
{
  @IsNumber()
  index: number;

  settings: Channel_SettingsValidation;

  @IsEnum(Protobuf.Channel.Channel_Role)
  role: Protobuf.Channel.Channel_Role;
}

export class Channel_SettingsValidation
  implements Omit<Protobuf.Channel.ChannelSettings, keyof Message | "psk">
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
