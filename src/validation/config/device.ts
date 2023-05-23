import { IsBoolean, IsEnum, IsInt } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class DeviceValidation
  implements Omit<Protobuf.Config_DeviceConfig, keyof Protobuf.native.Message>
{
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

  @IsEnum(Protobuf.Config_DeviceConfig_RebroadcastMode)
  rebroadcastMode: Protobuf.Config_DeviceConfig_RebroadcastMode;

  @IsInt()
  nodeInfoBroadcastSecs: number;

  @IsBoolean()
  doubleTapAsButtonPress: boolean;

  @IsBoolean()
  isManaged: boolean;
}
