import { z } from "zod";
import { Protobuf } from "@meshtastic/core";

const AddressModeEnum = z.nativeEnum(
  Protobuf.Config.Config_NetworkConfig_AddressMode,
);
const ProtocolFlagsEnum = z.nativeEnum(
  Protobuf.Config.Config_NetworkConfig_ProtocolFlags,
);

export const NetworkValidationIpV4ConfigSchema = z.object({
  ip: z.string().ip(),
  gateway: z.string().ip(),
  subnet: z.string().ip(),
  dns: z.string().ip(),
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
