import { Protobuf } from "@meshtastic/core";
import { z } from "zod/v4";

const Audio_BaudEnum = z.enum(
  Protobuf.ModuleConfig.ModuleConfig_AudioConfig_Audio_Baud,
);

export const AudioValidationSchema = z.object({
  codec2Enabled: z.boolean(),
  pttPin: z.coerce.number().int().min(0),
  bitrate: Audio_BaudEnum,
  i2sWs: z.coerce.number().int().min(0),
  i2sSd: z.coerce.number().int().min(0),
  i2sDin: z.coerce.number().int().min(0),
  i2sSck: z.coerce.number().int().min(0),
});

export type AudioValidation = z.infer<typeof AudioValidationSchema>;
