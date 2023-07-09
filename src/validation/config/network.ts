import {
  IsBoolean,
  IsEnum,
  IsIP,
  IsOptional,
  IsString,
  Length,
} from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class NetworkValidation
  implements
    Omit<
      Protobuf.Config_NetworkConfig,
      keyof Protobuf.native.Message | "ipv4Config"
    >
{
  @IsBoolean()
  wifiEnabled: boolean;

  @Length(1, 33)
  @IsOptional({})
  wifiSsid: string;

  @Length(8, 64)
  @IsOptional()
  wifiPsk: string;

  @Length(2, 30)
  ntpServer: string;

  @IsBoolean()
  ethEnabled: boolean;

  @IsEnum(Protobuf.Config_NetworkConfig_AddressMode)
  addressMode: Protobuf.Config_NetworkConfig_AddressMode;

  ipv4Config: NetworkValidation_IpV4Config;

  @IsString()
  rsyslogServer: string;
}

export class NetworkValidation_IpV4Config
  implements
    Omit<
      Protobuf.Config_NetworkConfig_IpV4Config,
      keyof Protobuf.native.Message
    >
{
  @IsIP()
  @IsOptional()
  ip: number;

  @IsIP()
  @IsOptional()
  gateway: number;

  @IsIP()
  @IsOptional()
  subnet: number;

  @IsIP()
  @IsOptional()
  dns: number;
}
