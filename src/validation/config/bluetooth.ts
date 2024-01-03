import { IsBoolean, IsEnum, IsInt } from "class-validator";
import { Protobuf } from "@meshtastic/js";
import type { Message } from "@bufbuild/protobuf";

export class BluetoothValidation
  implements Omit<Protobuf.Config.Config_BluetoothConfig, keyof Message>
{
  @IsBoolean()
  enabled: boolean;

  @IsEnum(Protobuf.Config.Config_BluetoothConfig_PairingMode)
  mode: Protobuf.Config.Config_BluetoothConfig_PairingMode;

  @IsInt()
  fixedPin: number;
}
