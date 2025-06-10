import { z } from "zod/v4";
import { Protobuf } from "@meshtastic/core";

const PairingModeEnum = z.enum(
  Protobuf.Config.Config_BluetoothConfig_PairingMode,
);

export const BluetoothValidationSchema = z.object({
  enabled: z.boolean(),
  mode: PairingModeEnum,
  fixedPin: z.coerce.number().int().min(100000).max(999999),
});

export type BluetoothValidation = z.infer<typeof BluetoothValidationSchema>;
