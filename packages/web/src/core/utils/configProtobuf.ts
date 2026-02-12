/**
 * Config Protobuf Builders
 *
 * Utilities for converting pending database changes into protobuf Config objects
 * for transmission to the device.
 */

import { create } from "@bufbuild/protobuf";
import type { ConfigChange } from "@data/schema.ts";
import type {
  ValidConfigType,
  ValidModuleConfigType,
} from "@features/settings/components/types.ts";
import { Protobuf } from "@meshtastic/core";

/**
 * Convert database config changes to protobuf Config objects for device.setConfig()
 *
 * Groups field-level changes by variant and creates protobuf objects with merged values.
 *
 * @param pendingChanges - All pending changes from database
 * @param baseConfig - Base config from device store to merge changes into
 * @returns Array of Protobuf.Config.Config objects ready for device.setConfig()
 */
export function buildConfigProtobuf(
  pendingChanges: ConfigChange[],
  baseConfig: Protobuf.LocalOnly.LocalConfig | null,
): Protobuf.Config.Config[] {
  if (!baseConfig) return [];

  // Group changes by variant
  const changesByVariant = new Map<string, ConfigChange[]>();
  for (const change of pendingChanges) {
    if (change.changeType === "config" && change.variant) {
      const existing = changesByVariant.get(change.variant) ?? [];
      existing.push(change);
      changesByVariant.set(change.variant, existing);
    }
  }

  const configs: Protobuf.Config.Config[] = [];

  for (const [variant, changes] of changesByVariant) {
    const variantBase = baseConfig[variant as ValidConfigType];
    if (!variantBase) continue;

    // Merge changes into base
    const merged = { ...variantBase } as Record<string, unknown>;
    for (const change of changes) {
      if (change.fieldPath) {
        merged[change.fieldPath] = change.value;
      }
    }

    configs.push(
      create(Protobuf.Config.ConfigSchema, {
        payloadVariant: {
          case: variant as ValidConfigType,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic config value from change tracking
          value: merged as never,
        },
      }),
    );
  }

  return configs;
}

/**
 * Convert database module config changes to protobuf ModuleConfig objects
 *
 * @param pendingChanges - All pending changes from database
 * @param baseModuleConfig - Base module config from device store to merge changes into
 * @returns Array of Protobuf.ModuleConfig.ModuleConfig objects
 */
export function buildModuleConfigProtobuf(
  pendingChanges: ConfigChange[],
  baseModuleConfig: Protobuf.LocalOnly.LocalModuleConfig | null,
): Protobuf.ModuleConfig.ModuleConfig[] {
  if (!baseModuleConfig) return [];

  // Group changes by variant
  const changesByVariant = new Map<string, ConfigChange[]>();
  for (const change of pendingChanges) {
    if (change.changeType === "moduleConfig" && change.variant) {
      const existing = changesByVariant.get(change.variant) ?? [];
      existing.push(change);
      changesByVariant.set(change.variant, existing);
    }
  }

  const configs: Protobuf.ModuleConfig.ModuleConfig[] = [];

  for (const [variant, changes] of changesByVariant) {
    const variantBase = baseModuleConfig[variant as ValidModuleConfigType];
    if (!variantBase) continue;

    // Merge changes into base
    const merged = { ...variantBase } as Record<string, unknown>;
    for (const change of changes) {
      if (change.fieldPath) {
        merged[change.fieldPath] = change.value;
      }
    }

    configs.push(
      create(Protobuf.ModuleConfig.ModuleConfigSchema, {
        payloadVariant: {
          case: variant as ValidModuleConfigType,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic config value from change tracking
          value: merged as never,
        },
      }),
    );
  }

  return configs;
}

/**
 * Convert database channel changes to protobuf Channel objects
 *
 * @param pendingChanges - All pending changes from database
 * @returns Array of Protobuf.Channel.Channel objects
 */
export function buildChannelProtobuf(
  pendingChanges: ConfigChange[],
): Protobuf.Channel.Channel[] {
  const channels: Protobuf.Channel.Channel[] = [];

  for (const change of pendingChanges) {
    if (change.changeType === "channel" && change.value) {
      channels.push(change.value as Protobuf.Channel.Channel);
    }
  }

  return channels;
}
