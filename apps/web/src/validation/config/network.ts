import { Protobuf } from "@meshtastic/sdk";
import { z } from "zod/v4";

const AddressModeEnum = z.enum(
  Protobuf.Config.Config_NetworkConfig_AddressMode,
);
const UDP_BROADCAST =
  Protobuf.Config.Config_NetworkConfig_ProtocolFlags.UDP_BROADCAST;

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
  /** Form only: the UDP_BROADCAST bit of enabledProtocols, as a switch. */
  udpBroadcast: z.boolean(),
  rsyslogServer: z.string().max(33),
});

export type NetworkValidation = z.infer<typeof NetworkValidationSchema>;

/** Whether the enabledProtocols bitmask has UDP broadcasting on. */
export function hasUdpBroadcast(enabledProtocols: number | undefined): boolean {
  return ((enabledProtocols ?? 0) & UDP_BROADCAST) !== 0;
}

/**
 * enabledProtocols with the UDP_BROADCAST bit set or cleared, keeping any
 * other protocol bits the device has.
 */
export function withUdpBroadcast(
  enabledProtocols: number | undefined,
  enabled: boolean,
): number {
  const flags = enabledProtocols ?? 0;
  return enabled ? flags | UDP_BROADCAST : flags & ~UDP_BROADCAST;
}
