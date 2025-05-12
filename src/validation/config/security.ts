import type { Message } from "@bufbuild/protobuf";
import type { Protobuf } from "@meshtastic/core";
import { IsBoolean, IsString } from "class-validator";

export class SecurityValidation implements
  Omit<
    Protobuf.Config.Config_SecurityConfig,
    | keyof Message
    | "adminKey"
    | "adminKey1"
    | "adminKey2"
    | "adminKey3"
    | "privateKey"
    | "publicKey"
  > {
  @IsBoolean()
  adminChannelEnabled: boolean;

  @IsString()
  adminKey1: string;

  @IsString()
  adminKey2: string;

  @IsString()
  adminKey3: string;

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
