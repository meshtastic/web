import { IsBoolean, IsString, Length } from "class-validator";
import type { Protobuf } from "@meshtastic/js";
import type { Message } from "@bufbuild/protobuf";

export class MqttValidation
  implements Omit<Protobuf.ModuleConfig.ModuleConfig_MQTTConfig, keyof Message>
{
  @IsBoolean()
  enabled: boolean;

  @Length(0, 30)
  address: string;

  @Length(0, 30)
  username: string;

  @Length(0, 30)
  password: string;

  @IsBoolean()
  encryptionEnabled: boolean;

  @IsBoolean()
  jsonEnabled: boolean;

  @IsBoolean()
  tlsEnabled: boolean;

  @IsString()
  root: string;

  @IsBoolean()
  proxyToClientEnabled: boolean;
}
