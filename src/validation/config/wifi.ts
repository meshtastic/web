import { IsBoolean, IsEnum, Length } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class WiFiValidation implements Protobuf.Config_WiFiConfig {
  @IsBoolean()
  enabled: boolean;

  @IsEnum(Protobuf.Config_WiFiConfig_WiFiMode)
  mode: Protobuf.Config_WiFiConfig_WiFiMode;

  @Length(1, 33)
  ssid: string;

  @Length(8, 64)
  psk: string;
}
