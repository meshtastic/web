import { z } from "zod/v4";
import { Protobuf } from "@meshtastic/core";

const Audio_BaudEnum = z.enum(
  Protobuf.ModuleConfig.ModuleConfig_AudioConfig_Audio_Baud,
);

export const AudioValidationSchema = z.object({
  codec2Enabled: z.boolean(),
  pttPin: z.int(),
  bitrate: Audio_BaudEnum,
  i2sWs: z.int(),
  i2sSd: z.int(),
  i2sDin: z.int(),
  i2sSck: z.int(),
});

export type AudioValidation = z.infer<typeof AudioValidationSchema>;
