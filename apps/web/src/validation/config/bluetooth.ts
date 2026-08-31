import { Protobuf } from "@meshtastic/sdk";
import { z } from "zod/v4";

const PairingModeEnum = z.enum(
  Protobuf.Config.Config_BluetoothConfig_PairingMode,
);

export const BluetoothValidationSchema = z
  .object({
    enabled: z.boolean(),
    mode: PairingModeEnum,
    // A device that has never used FIXED_PIN pairing reports `fixed_pin: 0`.
    // Demanding six digits unconditionally made that device's Bluetooth form
    // permanently invalid, and `DynamicForm` auto-saves through
    // `handleSubmit`, so *nothing* on the tab could be staged or saved. The
    // six-digit rule only actually applies to FIXED_PIN pairing.
    fixedPin: z.coerce.number().int().min(0).max(999999),
  })
  .refine(
    (config) =>
      config.mode !==
        Protobuf.Config.Config_BluetoothConfig_PairingMode.FIXED_PIN ||
      (config.fixedPin >= 100000 && config.fixedPin <= 999999),
    {
      message: "formValidation.tooSmall.number",
      path: ["fixedPin"],
      params: { minimum: 100000 },
    },
  );

export type BluetoothValidation = z.infer<typeof BluetoothValidationSchema>;
