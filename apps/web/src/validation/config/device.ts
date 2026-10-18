import { Protobuf } from "@meshtastic/sdk";
import { z } from "zod/v4";

const RoleEnum = z.enum(Protobuf.Config.Config_DeviceConfig_Role);
const RebroadcastModeEnum = z.enum(
  Protobuf.Config.Config_DeviceConfig_RebroadcastMode,
);

export const DeviceValidationSchema = z.object({
  role: RoleEnum,
  serialEnabled: z.boolean(),
  buttonGpio: z.coerce.number().int().min(0),
  buzzerGpio: z.coerce.number().int().min(0),
  rebroadcastMode: RebroadcastModeEnum,
  nodeInfoBroadcastSecs: z.coerce.number().int().min(0),
  doubleTapAsButtonPress: z.boolean(),
  isManaged: z.boolean(),
  // Shown the way Android shows them, as the inverse of the proto fields
  // disableTripleClick and ledHeartbeatDisabled.
  tripleClickAdHocPing: z.boolean(),
  ledHeartbeat: z.boolean(),
  tzdef: z.string().max(65),
});

export type DeviceValidation = z.infer<typeof DeviceValidationSchema>;

/** The form's values for a DeviceConfig, with the inverted toggles. */
export function toDeviceFormValues(
  cfg: Protobuf.Config.Config_DeviceConfig | undefined,
): DeviceValidation {
  return {
    ...cfg,
    tripleClickAdHocPing: !cfg?.disableTripleClick,
    ledHeartbeat: !cfg?.ledHeartbeatDisabled,
  } as DeviceValidation;
}

/** The DeviceConfig fields to stage from the form. */
export function toDeviceConfig({
  tripleClickAdHocPing,
  ledHeartbeat,
  ...rest
}: DeviceValidation) {
  return {
    ...rest,
    disableTripleClick: !tripleClickAdHocPing,
    ledHeartbeatDisabled: !ledHeartbeat,
  };
}
