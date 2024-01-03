import { IsBoolean, IsEnum, IsInt } from "class-validator";
import { Protobuf } from "@meshtastic/js";
import type { Message } from "@bufbuild/protobuf";

export class DeviceValidation
  implements Omit<Protobuf.Config.Config_DeviceConfig, keyof Message>
{
  @IsEnum(Protobuf.Config.Config_DeviceConfig_Role)
  role: Protobuf.Config.Config_DeviceConfig_Role;

  @IsBoolean()
  serialEnabled: boolean;

  @IsBoolean()
  debugLogEnabled: boolean;

  @IsInt()
  buttonGpio: number;

  @IsInt()
  buzzerGpio: number;

  @IsEnum(Protobuf.Config.Config_DeviceConfig_RebroadcastMode)
  rebroadcastMode: Protobuf.Config.Config_DeviceConfig_RebroadcastMode;

  @IsInt()
  nodeInfoBroadcastSecs: number;

  @IsBoolean()
  doubleTapAsButtonPress: boolean;

  @IsBoolean()
  isManaged: boolean;

  @IsBoolean()
  disableTripleClick: boolean;
}
