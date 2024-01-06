import type { Message } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/js";
import {
  IsBoolean,
  IsEnum,
  IsIP,
  IsOptional,
  IsString,
  Length,
} from "class-validator";

export class NetworkValidation
  implements
    Omit<Protobuf.Config.Config_NetworkConfig, keyof Message | "ipv4Config">
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

  @IsEnum(Protobuf.Config.Config_NetworkConfig_AddressMode)
  addressMode: Protobuf.Config.Config_NetworkConfig_AddressMode;

  ipv4Config: NetworkValidationIpV4Config;

  @IsString()
  rsyslogServer: string;
}

export class NetworkValidationIpV4Config
  implements
    Omit<Protobuf.Config.Config_NetworkConfig_IpV4Config, keyof Message>
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
