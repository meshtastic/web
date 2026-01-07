/**
 * Merkle tree utilities for config change tracking.
 *
 * Uses cyrb53 - a fast, high-quality non-cryptographic hash function.
 * Provides automatic change detection by comparing hash trees.
 */

// =============================================================================
// Constants
// =============================================================================

export const CONFIG_LEAF_KEYS = [
  "config:device",
  "config:position",
  "config:power",
  "config:network",
  "config:display",
  "config:lora",
  "config:bluetooth",
  "config:security",
] as const;

export const MODULE_CONFIG_LEAF_KEYS = [
  "moduleConfig:mqtt",
  "moduleConfig:serial",
  "moduleConfig:externalNotification",
  "moduleConfig:storeForward",
  "moduleConfig:rangeTest",
  "moduleConfig:telemetry",
  "moduleConfig:cannedMessage",
  "moduleConfig:audio",
  "moduleConfig:remoteHardware",
  "moduleConfig:neighborInfo",
  "moduleConfig:ambientLighting",
  "moduleConfig:detectionSensor",
  "moduleConfig:paxcounter",
] as const;

export const CHANNEL_LEAF_KEYS = [
  "channel:0",
  "channel:1",
  "channel:2",
  "channel:3",
  "channel:4",
  "channel:5",
  "channel:6",
  "channel:7",
] as const;

export const USER_LEAF_KEY = "user" as const;

export const ALL_LEAF_KEYS = [
  ...CONFIG_LEAF_KEYS,
  ...MODULE_CONFIG_LEAF_KEYS,
  ...CHANNEL_LEAF_KEYS,
  USER_LEAF_KEY,
] as const;

export type ConfigLeafKey = (typeof CONFIG_LEAF_KEYS)[number];
export type ModuleConfigLeafKey = (typeof MODULE_CONFIG_LEAF_KEYS)[number];
export type ChannelLeafKey = (typeof CHANNEL_LEAF_KEYS)[number];
export type LeafKey = (typeof ALL_LEAF_KEYS)[number];

// Extract variant name from leaf key
export type ConfigVariant = ConfigLeafKey extends `config:${infer V}`
  ? V
  : never;
export type ModuleConfigVariant =
  ModuleConfigLeafKey extends `moduleConfig:${infer V}` ? V : never;

// =============================================================================
// Hash Function - cyrb53
// =============================================================================

/**
 * cyrb53 - Fast, high-quality 53-bit hash function.
 *
 * Based on MurmurHash concepts but optimized for JavaScript.
 * Produces consistent results across runs.
 *
 * @param str - String to hash
 * @param seed - Optional seed for different hash families
 * @returns Hash as base36 string (compact representation)
 */
export function cyrb53(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  // Combine into 53-bit value (max safe integer precision)
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);

  return hash.toString(36);
}

// =============================================================================
// Deterministic Serialization
// =============================================================================

/**
 * Serialize an object to a deterministic JSON string.
 * Keys are sorted alphabetically at all levels to ensure consistent output.
 *
 * @param obj - Object to serialize
 * @returns Deterministic JSON string
 */
export function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return "null";
  }

  if (typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const items = obj.map((item) => stableStringify(item));
    return `[${items.join(",")}]`;
  }

  // Handle Map
  if (obj instanceof Map) {
    const entries = Array.from(obj.entries())
      .sort(([a], [b]) => String(a).localeCompare(String(b)))
      .map(([k, v]) => `${JSON.stringify(String(k))}:${stableStringify(v)}`);
    return `{${entries.join(",")}}`;
  }

  // Handle Set
  if (obj instanceof Set) {
    const items = Array.from(obj)
      .map((item) => stableStringify(item))
      .sort();
    return `[${items.join(",")}]`;
  }

  // Handle Date
  if (obj instanceof Date) {
    return JSON.stringify(obj.toISOString());
  }

  // Handle Uint8Array and other typed arrays
  if (ArrayBuffer.isView(obj)) {
    const arr = Array.from(obj as Uint8Array);
    return `[${arr.join(",")}]`;
  }

  // Regular object - sort keys
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const pairs = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`,
  );

  return `{${pairs.join(",")}}`;
}

// =============================================================================
// Config Hashing
// =============================================================================

/**
 * Hash a single config object.
 *
 * @param config - Config object (can be undefined/null)
 * @returns Hash string
 */
export function hashConfig(config: unknown): string {
  const serialized = stableStringify(config);
  return cyrb53(serialized);
}

/**
 * Input types for computing leaf hashes.
 * These are flexible to work with both protobuf objects and plain objects.
 */
export interface ComputeHashesInput {
  config?: {
    device?: unknown;
    position?: unknown;
    power?: unknown;
    network?: unknown;
    display?: unknown;
    lora?: unknown;
    bluetooth?: unknown;
    security?: unknown;
  };
  moduleConfig?: {
    mqtt?: unknown;
    serial?: unknown;
    externalNotification?: unknown;
    storeForward?: unknown;
    rangeTest?: unknown;
    telemetry?: unknown;
    cannedMessage?: unknown;
    audio?: unknown;
    remoteHardware?: unknown;
    neighborInfo?: unknown;
    ambientLighting?: unknown;
    detectionSensor?: unknown;
    paxcounter?: unknown;
  };
  channels?: Array<unknown>;
  user?: {
    shortName?: string | null;
    longName?: string | null;
    // Include other user fields that should be tracked
  };
}

/**
 * Compute all leaf hashes from current config state.
 *
 * @param input - Config, module config, channels, and user data
 * @returns Map of leaf key to hash
 */
export function computeLeafHashes(
  input: ComputeHashesInput,
): Map<string, string> {
  const hashes = new Map<string, string>();

  // Config leaves
  const config = input.config ?? {};
  hashes.set("config:device", hashConfig(config.device));
  hashes.set("config:position", hashConfig(config.position));
  hashes.set("config:power", hashConfig(config.power));
  hashes.set("config:network", hashConfig(config.network));
  hashes.set("config:display", hashConfig(config.display));
  hashes.set("config:lora", hashConfig(config.lora));
  hashes.set("config:bluetooth", hashConfig(config.bluetooth));
  hashes.set("config:security", hashConfig(config.security));

  // Module config leaves
  const moduleConfig = input.moduleConfig ?? {};
  hashes.set("moduleConfig:mqtt", hashConfig(moduleConfig.mqtt));
  hashes.set("moduleConfig:serial", hashConfig(moduleConfig.serial));
  hashes.set(
    "moduleConfig:externalNotification",
    hashConfig(moduleConfig.externalNotification),
  );
  hashes.set(
    "moduleConfig:storeForward",
    hashConfig(moduleConfig.storeForward),
  );
  hashes.set("moduleConfig:rangeTest", hashConfig(moduleConfig.rangeTest));
  hashes.set("moduleConfig:telemetry", hashConfig(moduleConfig.telemetry));
  hashes.set(
    "moduleConfig:cannedMessage",
    hashConfig(moduleConfig.cannedMessage),
  );
  hashes.set("moduleConfig:audio", hashConfig(moduleConfig.audio));
  hashes.set(
    "moduleConfig:remoteHardware",
    hashConfig(moduleConfig.remoteHardware),
  );
  hashes.set(
    "moduleConfig:neighborInfo",
    hashConfig(moduleConfig.neighborInfo),
  );
  hashes.set(
    "moduleConfig:ambientLighting",
    hashConfig(moduleConfig.ambientLighting),
  );
  hashes.set(
    "moduleConfig:detectionSensor",
    hashConfig(moduleConfig.detectionSensor),
  );
  hashes.set("moduleConfig:paxcounter", hashConfig(moduleConfig.paxcounter));

  // Channel leaves (0-7)
  const channels = input.channels ?? [];
  for (let i = 0; i < 8; i++) {
    const channel = channels[i];
    hashes.set(`channel:${i}`, hashConfig(channel));
  }

  // User leaf
  hashes.set("user", hashConfig(input.user));

  return hashes;
}

/**
 * Compute root hash from leaf hashes.
 *
 * Combines all leaf hashes in a deterministic order to produce a single root hash.
 * If any leaf changes, the root hash will change.
 *
 * @param leafHashes - Map of leaf key to hash
 * @returns Root hash string
 */
export function computeRootHash(leafHashes: Map<string, string>): string {
  // Combine leaves in deterministic order
  const combined = ALL_LEAF_KEYS.map((key) => leafHashes.get(key) ?? "").join(
    ":",
  );

  return cyrb53(combined);
}

/**
 * Get list of leaf keys that differ between two hash maps.
 *
 * @param base - Base (original) hashes
 * @param working - Working (current) hashes
 * @returns Array of leaf keys that have different hashes
 */
export function getChangedLeaves(
  base: Map<string, string>,
  working: Map<string, string>,
): LeafKey[] {
  const changed: LeafKey[] = [];

  for (const key of ALL_LEAF_KEYS) {
    const baseHash = base.get(key);
    const workingHash = working.get(key);

    if (baseHash !== workingHash) {
      changed.push(key);
    }
  }

  return changed;
}

/**
 * Check if any leaf hashes differ.
 *
 * @param base - Base hashes
 * @param working - Working hashes
 * @returns True if any hashes differ
 */
export function hasAnyChanges(
  base: Map<string, string>,
  working: Map<string, string>,
): boolean {
  for (const key of ALL_LEAF_KEYS) {
    if (base.get(key) !== working.get(key)) {
      return true;
    }
  }
  return false;
}

/**
 * Parse a leaf key into its type and identifier.
 *
 * @param key - Leaf key (e.g., "config:device", "channel:0")
 * @returns Parsed key info
 */
export function parseLeafKey(key: LeafKey): {
  type: "config" | "moduleConfig" | "channel" | "user";
  variant?: string;
  index?: number;
} {
  if (key === "user") {
    return { type: "user" };
  }

  if (key.startsWith("config:")) {
    return { type: "config", variant: key.slice(7) };
  }

  if (key.startsWith("moduleConfig:")) {
    return { type: "moduleConfig", variant: key.slice(13) };
  }

  if (key.startsWith("channel:")) {
    return { type: "channel", index: Number.parseInt(key.slice(8), 10) };
  }

  // Should never reach here with proper typing
  throw new Error(`Unknown leaf key: ${key}`);
}

/**
 * Group changed leaves by type for UI display.
 *
 * @param changedLeaves - Array of changed leaf keys
 * @returns Grouped changes
 */
export function groupChangedLeaves(changedLeaves: LeafKey[]): {
  configChanges: string[];
  moduleConfigChanges: string[];
  channelChanges: number[];
  hasUserChange: boolean;
} {
  const configChanges: string[] = [];
  const moduleConfigChanges: string[] = [];
  const channelChanges: number[] = [];
  let hasUserChange = false;

  for (const key of changedLeaves) {
    const parsed = parseLeafKey(key);

    switch (parsed.type) {
      case "config":
        if (parsed.variant) configChanges.push(parsed.variant);
        break;
      case "moduleConfig":
        if (parsed.variant) moduleConfigChanges.push(parsed.variant);
        break;
      case "channel":
        if (parsed.index !== undefined) channelChanges.push(parsed.index);
        break;
      case "user":
        hasUserChange = true;
        break;
    }
  }

  return {
    configChanges,
    moduleConfigChanges,
    channelChanges,
    hasUserChange,
  };
}

/**
 * Create an empty hash map with all leaf keys set to empty hash.
 *
 * @returns Map with all leaf keys initialized to empty config hash
 */
export function createEmptyHashes(): Map<string, string> {
  const emptyHash = hashConfig(undefined);
  const hashes = new Map<string, string>();

  for (const key of ALL_LEAF_KEYS) {
    hashes.set(key, emptyHash);
  }

  return hashes;
}
