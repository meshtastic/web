import { Length } from "class-validator";

import type { Protobuf } from "@meshtastic/meshtasticjs";

export class WiFiValidation implements Protobuf.Config_WiFiConfig {
  @Length(1, 33)
  ssid: string;

  @Length(8, 64)
  psk: string;

  apMode: boolean;

  apHidden: boolean;
}
