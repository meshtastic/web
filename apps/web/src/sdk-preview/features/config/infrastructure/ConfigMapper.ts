import type { Protobuf } from "@meshtastic/core";
import type { ModuleConfig } from "../domain/ModuleConfig.ts";
import type { RadioConfig } from "../domain/RadioConfig.ts";

/**
 * Translates inbound protobuf `Config` / `ModuleConfig` packets into the slice's
 * section-keyed domain shape. Fully generic — new firmware sections flow through
 * with no code change, exactly like the SDK mapper in PR #1050.
 */
export const ConfigMapper = {
  mergeRadio(
    existing: RadioConfig,
    incoming: Protobuf.Config.Config,
  ): RadioConfig {
    const variant = incoming.payloadVariant;
    if (!variant.case) {
      return existing;
    }
    return { ...existing, [variant.case]: variant.value };
  },

  mergeModule(
    existing: ModuleConfig,
    incoming: Protobuf.ModuleConfig.ModuleConfig,
  ): ModuleConfig {
    const variant = incoming.payloadVariant;
    if (!variant.case) {
      return existing;
    }
    return { ...existing, [variant.case]: variant.value };
  },
};
