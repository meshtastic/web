import { IsBoolean, IsEnum, IsInt } from "class-validator";

import { Protobuf } from "@meshtastic/meshtasticjs";

export class AudioValidation implements Protobuf.ModuleConfig_AudioConfig {
  @IsBoolean()
  codec2Enabled: boolean;

  @IsInt()
  pttPin: number;

  @IsEnum(Protobuf.ModuleConfig_AudioConfig_Audio_Baud)
  bitrate: Protobuf.ModuleConfig_AudioConfig_Audio_Baud;

  @IsInt()
  i2SWs: number;

  @IsInt()
  i2SSd: number;

  @IsInt()
  i2SDin: number;

  @IsInt()
  i2SSck: number;
}
