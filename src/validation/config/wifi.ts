import { Length } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class WiFiValidation implements Protobuf.Config_WiFiConfig {
  @Length(1, 30)
  ssid: string;

  @Length(8, 16)
  psk: string;

  apMode: boolean;

  apHidden: boolean;
}
