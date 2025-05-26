import { z } from "zod/v4";
import { Protobuf } from "@meshtastic/core";

const Serial_BaudEnum = z.enum(
  Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Baud,
);
const Serial_ModeEnum = z.enum(
  Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Mode,
);

export const SerialValidationSchema = z.object({
  enabled: z.boolean(),
  echo: z.boolean(),
  rxd: z.int(),
  txd: z.int(),
  baud: Serial_BaudEnum,
  timeout: z.int(),
  mode: Serial_ModeEnum,
  overrideConsoleSerialPort: z.boolean(),
});

export type SerialValidation = z.infer<typeof SerialValidationSchema>;
