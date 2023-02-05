import { IsBoolean, IsEnum, IsInt, Length } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class CannedMessageValidation
  implements
    Omit<
      Protobuf.ModuleConfig_CannedMessageConfig,
      keyof Protobuf.native.Message
    >
{
  @IsBoolean()
  rotary1Enabled: boolean;

  @IsInt()
  inputbrokerPinA: number;

  @IsInt()
  inputbrokerPinB: number;

  @IsInt()
  inputbrokerPinPress: number;

  @IsEnum(Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar)
  inputbrokerEventCw: Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar;

  @IsEnum(Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar)
  inputbrokerEventCcw: Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar;

  @IsEnum(Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar)
  inputbrokerEventPress: Protobuf.ModuleConfig_CannedMessageConfig_InputEventChar;

  @IsBoolean()
  updown1Enabled: boolean;

  @IsBoolean()
  enabled: boolean;

  @Length(2, 30)
  allowInputSource: string;

  @IsBoolean()
  sendBell: boolean;
}
