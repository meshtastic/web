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

// Admin message types that can be queued
export type ValidAdminMessageType = "setFixedPosition" | "other";

// Unified config change key type
export type ConfigChangeKey =
  | { type: "config"; variant: ValidConfigType }
  | { type: "moduleConfig"; variant: ValidModuleConfigType }
  | { type: "channel"; index: Types.ChannelNumber }
  | { type: "user" }
  | { type: "adminMessage"; variant: ValidAdminMessageType; id: string };

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
    case "channel":
      return `channel:${key.index}`;
    case "user":
      return "user";
    case "adminMessage":
      return `adminMessage:${key.variant}:${key.id}`;
  }
}

/**
 * Reverse operation for type-safe retrieval
 */
export function deserializeKey(keyStr: ConfigChangeKeyString): ConfigChangeKey {
  const parts = keyStr.split(":");
  const type = parts[0];

  switch (type) {
    case "config":
      return { type: "config", variant: parts[1] as ValidConfigType };
    case "moduleConfig":
      return {
        type: "moduleConfig",
        variant: parts[1] as ValidModuleConfigType,
      };
    case "channel":
      return {
        type: "channel",
        index: Number(parts[1]) as Types.ChannelNumber,
      };
    case "user":
      return { type: "user" };
    case "adminMessage":
      return {
        type: "adminMessage",
        variant: parts[1] as ValidAdminMessageType,
        id: parts[2] ?? "",
      };
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
  return registry.changes.has(serializeKey({ type: "channel", index }));
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
    if (key.type === "channel") {
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
    if (entry.key.type === "channel") {
      changes.push(entry);
    }
  }
  return changes;
}

/**
 * Get all admin message changes as an array
 */
export function getAllAdminMessages(registry: ChangeRegistry): ChangeEntry[] {
  const changes: ChangeEntry[] = [];
  for (const entry of registry.changes.values()) {
    if (entry.key.type === "adminMessage") {
      changes.push(entry);
    }
  }
  return changes;
}

/**
 * Get count of admin message changes
 */
export function getAdminMessageChangeCount(registry: ChangeRegistry): number {
  let count = 0;
  for (const keyStr of registry.changes.keys()) {
    const key = deserializeKey(keyStr);
    if (key.type === "adminMessage") {
      count++;
    }
  }
  return count;
}
