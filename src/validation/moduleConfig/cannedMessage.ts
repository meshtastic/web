import type { Message } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/js";
import { IsBoolean, IsEnum, IsInt, Length } from "class-validator";

export class CannedMessageValidation
  implements
    Omit<Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig, keyof Message>
{
  @IsBoolean()
  rotary1Enabled: boolean;

  @IsInt()
  inputbrokerPinA: number;

  @IsInt()
  inputbrokerPinB: number;

  @IsInt()
  inputbrokerPinPress: number;

  @IsEnum(Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar)
  inputbrokerEventCw: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar;

  @IsEnum(Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar)
  inputbrokerEventCcw: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar;

  @IsEnum(Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar)
  inputbrokerEventPress: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar;

  @IsBoolean()
  updown1Enabled: boolean;

  @IsBoolean()
  enabled: boolean;

  @Length(2, 30)
  allowInputSource: string;

  @IsBoolean()
  sendBell: boolean;
}
