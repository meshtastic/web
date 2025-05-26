import { z } from "zod/v4";
import { Protobuf } from "@meshtastic/core";

const AddressModeEnum = z.enum(
  Protobuf.Config.Config_NetworkConfig_AddressMode,
);
const ProtocolFlagsEnum = z.enum(
  Protobuf.Config.Config_NetworkConfig_ProtocolFlags,
);

export const NetworkValidationIpV4ConfigSchema = z.object({
  ip: z.ipv4(),
  gateway: z.ipv4(),
  subnet: z.ipv4(),
  dns: z.ipv4(),
});

export const NetworkValidationSchema = z.object({
  wifiEnabled: z.boolean(),
  wifiSsid: z.string().min(0).max(33).optional(),
  wifiPsk: z.string().min(0).max(64).optional(),
  ntpServer: z.string().min(2).max(30),
  ethEnabled: z.boolean(),
  addressMode: AddressModeEnum,
  ipv4Config: NetworkValidationIpV4ConfigSchema.optional(),
  enabledProtocols: ProtocolFlagsEnum,
  rsyslogServer: z.string(),
});

export type NetworkValidation = z.infer<typeof NetworkValidationSchema>;
