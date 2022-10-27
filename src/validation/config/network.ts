import { IsBoolean, IsEnum, IsIP, Length } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class NetworkValidation implements Protobuf.Config_NetworkConfig {
  @IsBoolean()
  wifiEnabled: boolean;

  @IsEnum(Protobuf.Config_NetworkConfig_WiFiMode)
  wifiMode: Protobuf.Config_NetworkConfig_WiFiMode;

  @Length(1, 33)
  wifiSsid: string;

  @Length(8, 64)
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
  ip: number;

  @IsIP()
  gateway: number;

  @IsIP()
  subnet: number;

  @IsIP()
  dns: number;
}
