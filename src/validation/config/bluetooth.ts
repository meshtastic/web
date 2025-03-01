import type { Message } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/core";
import { IsBoolean, IsEnum, IsInt } from "class-validator";

export class BluetoothValidation
  implements
    Omit<
      Protobuf.Config.Config_BluetoothConfig,
      keyof Message | "deviceLoggingEnabled"
    >
{
  @IsBoolean()
  enabled: boolean;

  @IsEnum(Protobuf.Config.Config_BluetoothConfig_PairingMode)
  mode: Protobuf.Config.Config_BluetoothConfig_PairingMode;

  @IsInt()
  fixedPin: number;
}
