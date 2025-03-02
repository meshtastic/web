import type { Message } from "@bufbuild/protobuf";
import type { Protobuf } from "@meshtastic/core";
import { IsBoolean, IsString } from "class-validator";

export class SecurityValidation implements
  Omit<
    Protobuf.Config.Config_SecurityConfig,
    keyof Message | "adminKey" | "privateKey" | "publicKey"
  > {
  @IsBoolean()
  adminChannelEnabled: boolean;

  @IsString()
  adminKey: string;

  @IsBoolean()
  bluetoothLoggingEnabled: boolean;

  @IsBoolean()
  debugLogApiEnabled: boolean;

  @IsBoolean()
  isManaged: boolean;

  @IsString()
  privateKey: string;

  @IsString()
  publicKey: string;

  @IsBoolean()
  serialEnabled: boolean;
}
