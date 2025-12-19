import { Protobuf } from "@meshtastic/core";
import { z } from "zod/v4";

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
  wifiSsid: z.string().max(33),
  wifiPsk: z.string().max(64),
  ntpServer: z.string().min(0).max(33),
  ethEnabled: z.boolean(),
  addressMode: AddressModeEnum,
  ipv4Config: NetworkValidationIpV4ConfigSchema,
  enabledProtocols: ProtocolFlagsEnum,
  rsyslogServer: z.string().max(33),
});

export type NetworkValidation = z.infer<typeof NetworkValidationSchema>;
