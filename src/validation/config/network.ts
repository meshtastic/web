import { IsBoolean, IsEnum, IsIP, IsOptional, Length } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class NetworkValidation implements Protobuf.Config_NetworkConfig {
  @IsBoolean()
  wifiEnabled: boolean;

  @IsEnum(Protobuf.Config_NetworkConfig_WiFiMode)
  wifiMode: Protobuf.Config_NetworkConfig_WiFiMode;

  @Length(0, 33) //min 1
  @IsOptional({})
  wifiSsid: string;

  @Length(0, 64) //min 8
  @IsOptional()
  wifiPsk: string;

  @Length(2, 30)
  ntpServer: string;

  @IsBoolean()
  ethEnabled: boolean;

  @IsEnum(Protobuf.Config_NetworkConfig_EthMode)
  ethMode: Protobuf.Config_NetworkConfig_EthMode;

  ethConfig: NetworkValidation_IpV4Config;
}

export class NetworkValidation_IpV4Config
  implements Protobuf.Config_NetworkConfig_IpV4Config
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
