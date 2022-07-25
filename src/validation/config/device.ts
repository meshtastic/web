import { IsBoolean, IsEnum, Length } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class DeviceValidation implements Protobuf.Config_DeviceConfig {
  @IsEnum(Protobuf.Config_DeviceConfig_Role)
  role: Protobuf.Config_DeviceConfig_Role;

  @IsBoolean()
  serialDisabled: boolean;

  @IsBoolean()
  factoryReset: boolean;

  @IsBoolean()
  debugLogEnabled: boolean;

  @Length(2, 30)
  ntpServer: string;
}
