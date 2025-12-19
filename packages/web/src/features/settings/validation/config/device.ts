import { Protobuf } from "@meshtastic/core";
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
  disableTripleClick: z.boolean(),
  ledHeartbeatDisabled: z.boolean(),
  tzdef: z.string().max(65),
});

export type DeviceValidation = z.infer<typeof DeviceValidationSchema>;
