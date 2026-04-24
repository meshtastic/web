import type * as Protobuf from "@meshtastic/protobufs";
import type { ModuleConfig } from "../domain/ModuleConfig.ts";
import type { RadioConfig } from "../domain/RadioConfig.ts";

export const ConfigMapper = {
  mergeRadio(existing: RadioConfig, incoming: Protobuf.Config.Config): RadioConfig {
    const variant = incoming.payloadVariant;
    if (!variant.case) return existing;
    return { ...existing, [variant.case]: variant.value };
  },
  mergeModule(existing: ModuleConfig, incoming: Protobuf.ModuleConfig.ModuleConfig): ModuleConfig {
    const variant = incoming.payloadVariant;
    if (!variant.case) return existing;
    return { ...existing, [variant.case]: variant.value };
  },
};
