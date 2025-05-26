import { z } from "zod/v4";
import { Protobuf } from "@meshtastic/core";

const PairingModeEnum = z.enum(
  Protobuf.Config.Config_BluetoothConfig_PairingMode,
);

export const BluetoothValidationSchema = z.object({
  enabled: z.boolean(),
  mode: PairingModeEnum,
  fixedPin: z.int(),
});

export type BluetoothValidation = z.infer<typeof BluetoothValidationSchema>;
