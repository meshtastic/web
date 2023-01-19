import { IsBoolean, IsEnum, IsInt } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class AudioValidation
  implements
    Omit<Protobuf.ModuleConfig_AudioConfig, keyof Protobuf.native.Message>
{
  @IsBoolean()
  codec2Enabled: boolean;

  @IsInt()
  pttPin: number;

  @IsEnum(Protobuf.ModuleConfig_AudioConfig_Audio_Baud)
  bitrate: Protobuf.ModuleConfig_AudioConfig_Audio_Baud;

  @IsInt()
  i2sWs: number;

  @IsInt()
  i2sSd: number;

  @IsInt()
  i2sDin: number;

  @IsInt()
  i2sSck: number;
}
