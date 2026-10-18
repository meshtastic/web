import { Protobuf } from "@meshtastic/sdk";
import { z } from "zod/v4";

const PairingModeEnum = z.enum(
  Protobuf.Config.Config_BluetoothConfig_PairingMode,
);

const MIN_FIXED_PIN = 100000;

export const BluetoothValidationSchema = z
  .object({
    enabled: z.boolean(),
    mode: PairingModeEnum,
    fixedPin: z.coerce.number().int().min(0).max(999999),
  })
  .superRefine((config, ctx) => {
    // Radios that never used a fixed PIN report 0.
    if (
      config.mode ===
        Protobuf.Config.Config_BluetoothConfig_PairingMode.FIXED_PIN &&
      config.fixedPin < MIN_FIXED_PIN
    ) {
      ctx.addIssue({
        code: "too_small",
        origin: "number",
        minimum: MIN_FIXED_PIN,
        inclusive: true,
        input: config.fixedPin,
        path: ["fixedPin"],
      });
    }
  });

export type BluetoothValidation = z.infer<typeof BluetoothValidationSchema>;
