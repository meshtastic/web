import type { Message } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/js";
import { IsBoolean, IsEnum, IsInt } from "class-validator";

export class AudioValidation
  implements Omit<Protobuf.ModuleConfig.ModuleConfig_AudioConfig, keyof Message>
{
  @IsBoolean()
  codec2Enabled: boolean;

  @IsInt()
  pttPin: number;

  @IsEnum(Protobuf.ModuleConfig.ModuleConfig_AudioConfig_Audio_Baud)
  bitrate: Protobuf.ModuleConfig.ModuleConfig_AudioConfig_Audio_Baud;

  @IsInt()
  i2sWs: number;

  @IsInt()
  i2sSd: number;

  @IsInt()
  i2sDin: number;

  @IsInt()
  i2sSck: number;
}
