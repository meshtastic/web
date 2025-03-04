import type { Message } from "@bufbuild/protobuf";
import type { Protobuf } from "@meshtastic/core";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from "class-validator";

export class MqttValidation implements
  Omit<
    Protobuf.ModuleConfig.ModuleConfig_MQTTConfig,
    keyof Message | "mapReportSettings"
  > {
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

  @IsBoolean()
  mapReportingEnabled: boolean;

  mapReportSettings: MqttValidationMapReportSettings;
}

export class MqttValidationMapReportSettings
  implements
    Omit<Protobuf.ModuleConfig.ModuleConfig_MapReportSettings, keyof Message> {
  @IsNumber()
  @IsOptional()
  publishIntervalSecs: number;

  @IsNumber()
  @IsOptional()
  positionPrecision: number;
}
