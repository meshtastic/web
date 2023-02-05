import { IsBoolean, IsEnum, IsInt } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class BluetoothValidation
  implements
    Omit<Protobuf.Config_BluetoothConfig, keyof Protobuf.native.Message>
{
  @IsBoolean()
  enabled: boolean;

  @IsEnum(Protobuf.Config_BluetoothConfig_PairingMode)
  mode: Protobuf.Config_BluetoothConfig_PairingMode;

  @IsInt()
  fixedPin: number;
}
