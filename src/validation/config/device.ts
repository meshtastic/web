import { z } from "zod/v4";
import { Protobuf } from "@meshtastic/core";

const RoleEnum = z.enum(
  Protobuf.Config.Config_DeviceConfig_Role,
);
const RebroadcastModeEnum = z.enum(
  Protobuf.Config.Config_DeviceConfig_RebroadcastMode,
);

export const DeviceValidationSchema = z.object({
  role: RoleEnum,
  serialEnabled: z.boolean(),
  debugLogEnabled: z.boolean(),
  buttonGpio: z.int(),
  buzzerGpio: z.int(),
  rebroadcastMode: RebroadcastModeEnum,
  nodeInfoBroadcastSecs: z.int(),
  doubleTapAsButtonPress: z.boolean(),
  isManaged: z.boolean(),
  disableTripleClick: z.boolean(),
  ledHeartbeatDisabled: z.boolean(),
  tzdef: z.string(),
});

export type DeviceValidation = z.infer<typeof DeviceValidationSchema>;
