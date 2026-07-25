import { Protobuf } from "@meshtastic/sdk";

const Policy = Protobuf.Config.Config_SecurityConfig_PacketSignaturePolicy;

export const PACKET_SIGNATURE_POLICY_OPTIONS = {
  COMPATIBLE: Policy.COMPATIBLE,
  BALANCED: Policy.BALANCED,
  STRICT: Policy.STRICT,
} as const;

export type PacketSignaturePolicyKey =
  keyof typeof PACKET_SIGNATURE_POLICY_OPTIONS;

export const STRICT_PACKET_SIGNATURE_POLICY_KEY =
  "STRICT" satisfies PacketSignaturePolicyKey;
