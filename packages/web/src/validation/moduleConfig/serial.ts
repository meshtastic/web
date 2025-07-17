import { Protobuf } from "@meshtastic/core";
import { z } from "zod/v4";

const Serial_BaudEnum = z.enum(
  Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Baud,
);
const Serial_ModeEnum = z.enum(
  Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Mode,
);

export const SerialValidationSchema = z.object({
  enabled: z.boolean(),
  echo: z.boolean(),
  rxd: z.coerce.number().int().min(0),
  txd: z.coerce.number().int().min(0),
  baud: Serial_BaudEnum,
  timeout: z.coerce.number().int().min(0),
  mode: Serial_ModeEnum,
  overrideConsoleSerialPort: z.boolean(),
});

export type SerialValidation = z.infer<typeof SerialValidationSchema>;
