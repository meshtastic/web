import type { Message } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/js";
import { IsBoolean, IsEnum, IsInt } from "class-validator";

export class SerialValidation
  implements
    Omit<Protobuf.ModuleConfig.ModuleConfig_SerialConfig, keyof Message>
{
  @IsBoolean()
  enabled: boolean;

  @IsBoolean()
  echo: boolean;

  @IsInt()
  rxd: number;

  @IsInt()
  txd: number;

  @IsEnum(Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Baud)
  baud: Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Baud;

  @IsInt()
  timeout: number;

  @IsEnum(Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Mode)
  mode: Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Mode;

  @IsBoolean()
  overrideConsoleSerialPort: boolean;
}
