import { create } from "@bufbuild/protobuf";
import { validateMaxByteLength } from "@core/utils/string.ts";
import { Protobuf } from "@meshtastic/sdk";
import { z } from "zod/v4";

/** nanopb max_count for available_pins. */
export const REMOTE_HARDWARE_MAX_PINS = 4;
/** nanopb max_size 15 for a pin name, less the terminator. */
export const REMOTE_HARDWARE_PIN_NAME_MAX_BYTES = 14;

export const RemoteHardwarePinValidationSchema = z.object({
  gpioPin: z.coerce.number().int().min(0),
  name: z
    .string()
    .refine(
      (s) =>
        validateMaxByteLength(s, REMOTE_HARDWARE_PIN_NAME_MAX_BYTES).isValid,
      {
        message: "formValidation.tooBig.bytes",
        params: { maximum: REMOTE_HARDWARE_PIN_NAME_MAX_BYTES },
      },
    ),
  type: z.enum(Protobuf.ModuleConfig.RemoteHardwarePinType),
});

export const RemoteHardwareValidationSchema = z.object({
  enabled: z.boolean(),
  allowUndefinedPinAccess: z.boolean(),
  availablePins: z
    .array(RemoteHardwarePinValidationSchema)
    .max(REMOTE_HARDWARE_MAX_PINS),
});

export type RemoteHardwarePinValidation = z.infer<
  typeof RemoteHardwarePinValidationSchema
>;

export type RemoteHardwareValidation = z.infer<
  typeof RemoteHardwareValidationSchema
>;

/** The config to stage, with each pin built as a proper protobuf message. */
export function toRemoteHardwareConfig(
  data: RemoteHardwareValidation,
): Partial<Protobuf.ModuleConfig.ModuleConfig_RemoteHardwareConfig> {
  return {
    enabled: data.enabled,
    allowUndefinedPinAccess: data.allowUndefinedPinAccess,
    availablePins: data.availablePins.map((pin) =>
      createPin(pin.gpioPin, pin.name, pin.type),
    ),
  };
}

function createPin(
  gpioPin: number,
  name: string,
  type: Protobuf.ModuleConfig.RemoteHardwarePinType,
): Protobuf.ModuleConfig.RemoteHardwarePin {
  return create(Protobuf.ModuleConfig.RemoteHardwarePinSchema, {
    gpioPin,
    name,
    type,
  });
}
