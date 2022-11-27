import { IsBoolean, IsEnum, IsInt } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class DeviceValidation implements Protobuf.Config_DeviceConfig {
  @IsEnum(Protobuf.Config_DeviceConfig_Role)
  role: Protobuf.Config_DeviceConfig_Role;

  @IsBoolean()
  serialEnabled: boolean;

  @IsBoolean()
  debugLogEnabled: boolean;

  @IsInt()
  buttonGpio: number;

  @IsInt()
  buzzerGpio: number;
}
