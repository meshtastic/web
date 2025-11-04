import type { Types } from "@meshtastic/core";

// Config type discriminators
export type ValidConfigType =
  | "device"
  | "position"
  | "power"
  | "network"
  | "display"
  | "lora"
  | "bluetooth"
  | "security";

export type ValidModuleConfigType =
  | "mqtt"
  | "serial"
  | "externalNotification"
  | "storeForward"
  | "rangeTest"
  | "telemetry"
  | "cannedMessage"
  | "audio"
  | "neighborInfo"
  | "ambientLighting"
  | "detectionSensor"
  | "paxcounter";

// Unified config change key type
export type ConfigChangeKey =
  | { type: "config"; variant: ValidConfigType }
  | { type: "moduleConfig"; variant: ValidModuleConfigType }
  | { type: "channels"; index: Types.ChannelNumber }
  | { type: "user" };

// Serialized key for Map storage
export type ConfigChangeKeyString = string;

// Registry entry
export interface ChangeEntry {
  key: ConfigChangeKey;
  value: unknown;
  timestamp: number;
  originalValue?: unknown;
}

// The unified registry
export interface ChangeRegistry {
  changes: Map<ConfigChangeKeyString, ChangeEntry>;
}

/**
 * Convert structured key to string for Map lookup
 */
export function serializeKey(key: ConfigChangeKey): ConfigChangeKeyString {
  switch (key.type) {
    case "config":
      return `config:${key.variant}`;
    case "moduleConfig":
      return `moduleConfig:${key.variant}`;
    case "channels":
      return `channel:${key.index}`;
    case "user":
      return "user";
  }
}

/**
 * Reverse operation for type-safe retrieval
 */
export function deserializeKey(keyStr: ConfigChangeKeyString): ConfigChangeKey {
  const [type, variant] = keyStr.split(":");

  switch (type) {
    case "config":
      return { type: "config", variant: variant as ValidConfigType };
    case "moduleConfig":
      return {
        type: "moduleConfig",
        variant: variant as ValidModuleConfigType,
      };
    case "channels":
      return {
        type: "channels",
        index: Number(variant) as Types.ChannelNumber,
      };
    case "user":
      return { type: "user" };
    default:
      throw new Error(`Unknown key type: ${type}`);
  }
}

/**
 * Create an empty change registry
 */
export function createChangeRegistry(): ChangeRegistry {
  return {
    changes: new Map(),
  };
}

/**
 * Check if a config variant has changes
 */
export function hasConfigChange(
  registry: ChangeRegistry,
  variant: ValidConfigType,
): boolean {
  return registry.changes.has(serializeKey({ type: "config", variant }));
}

/**
 * Check if a module config variant has changes
 */
export function hasModuleConfigChange(
  registry: ChangeRegistry,
  variant: ValidModuleConfigType,
): boolean {
  return registry.changes.has(serializeKey({ type: "moduleConfig", variant }));
}

/**
 * Check if a channel has changes
 */
export function hasChannelChange(
  registry: ChangeRegistry,
  index: Types.ChannelNumber,
): boolean {
  return registry.changes.has(serializeKey({ type: "channels", index }));
}

/**
 * Check if user config has changes
 */
export function hasUserChange(registry: ChangeRegistry): boolean {
  return registry.changes.has(serializeKey({ type: "user" }));
}

/**
 * Get count of config changes
 */
export function getConfigChangeCount(registry: ChangeRegistry): number {
  let count = 0;
  for (const keyStr of registry.changes.keys()) {
    const key = deserializeKey(keyStr);
    if (key.type === "config") {
      count++;
    }
  }
  return count;
}

/**
 * Get count of module config changes
 */
export function getModuleConfigChangeCount(registry: ChangeRegistry): number {
  let count = 0;
  for (const keyStr of registry.changes.keys()) {
    const key = deserializeKey(keyStr);
    if (key.type === "moduleConfig") {
      count++;
    }
  }
  return count;
}

/**
 * Get count of channel changes
 */
export function getChannelChangeCount(registry: ChangeRegistry): number {
  let count = 0;
  for (const keyStr of registry.changes.keys()) {
    const key = deserializeKey(keyStr);
    if (key.type === "channels") {
      count++;
    }
  }
  return count;
}

/**
 * Get all config changes as an array
 */
export function getAllConfigChanges(registry: ChangeRegistry): ChangeEntry[] {
  const changes: ChangeEntry[] = [];
  for (const entry of registry.changes.values()) {
    if (entry.key.type === "config") {
      changes.push(entry);
    }
  }
  return changes;
}

/**
 * Get all module config changes as an array
 */
export function getAllModuleConfigChanges(
  registry: ChangeRegistry,
): ChangeEntry[] {
  const changes: ChangeEntry[] = [];
  for (const entry of registry.changes.values()) {
    if (entry.key.type === "moduleConfig") {
      changes.push(entry);
    }
  }
  return changes;
}

/**
 * Get all channel changes as an array
 */
export function getAllChannelChanges(registry: ChangeRegistry): ChangeEntry[] {
  const changes: ChangeEntry[] = [];
  for (const entry of registry.changes.values()) {
    if (entry.key.type === "channels") {
      changes.push(entry);
    }
  }
  return changes;
}
