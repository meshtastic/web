import { create } from "@bufbuild/protobuf";
import { Protobuf } from "@meshtastic/core";
import type {
  ModuleConfig,
  ModuleConfigSection,
} from "../domain/ModuleConfig.ts";
import type { RadioConfig, RadioConfigSection } from "../domain/RadioConfig.ts";

/** Wrap a single radio-config section value back into a `Config` message. */
export function buildRadioConfig<K extends RadioConfigSection>(
  section: K,
  value: NonNullable<RadioConfig[K]>,
): Protobuf.Config.Config {
  return create(Protobuf.Config.ConfigSchema, {
    payloadVariant: {
      case: section,
      value,
    } as Protobuf.Config.Config["payloadVariant"],
  });
}

/** Wrap a single module-config section value back into a `ModuleConfig` message. */
export function buildModuleConfig<K extends ModuleConfigSection>(
  section: K,
  value: NonNullable<ModuleConfig[K]>,
): Protobuf.ModuleConfig.ModuleConfig {
  return create(Protobuf.ModuleConfig.ModuleConfigSchema, {
    payloadVariant: {
      case: section,
      value,
    } as Protobuf.ModuleConfig.ModuleConfig["payloadVariant"],
  });
}
