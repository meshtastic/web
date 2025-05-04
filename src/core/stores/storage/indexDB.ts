import { PersistStorage, StateStorage } from "zustand/middleware";
import { del, get, set } from "idb-keyval";
import { ChannelId, MessageLogMap } from "@core/stores/messageStore/types.ts";

type PersistedMessageState = {
  messages: {
    direct: Map<string, MessageLogMap>;
    broadcast: Map<ChannelId, MessageLogMap>;
  };
  nodeNum: number;
};

export const zustandIndexDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

type SerializedMap<K = unknown, V = unknown> = {
  __dataType: "Map";
  value: Array<[K, V]>;
};
// deno-lint-ignore no-explicit-any
type JsonReplacer = (this: any, key: string, value: unknown) => unknown;
const replacer: JsonReplacer = (_, value) => {
  if (value instanceof Map) {
    const map = value as Map<unknown, unknown>;
    const serialized: SerializedMap = {
      __dataType: "Map",
      value: Array.from(map.entries()),
    };
    return serialized;
  }
  return value;
};
// deno-lint-ignore no-explicit-any
type JsonReviver = (this: any, key: string, value: unknown) => unknown;
function isSerializedMap(value: unknown): value is SerializedMap {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const potentialMap = value as Partial<SerializedMap>;
  return potentialMap.__dataType === "Map" && Array.isArray(potentialMap.value);
}
const reviver: JsonReviver = (_, value) => {
  if (isSerializedMap(value)) {
    return new Map(value.value);
  }
  return value;
};

export const storageWithMapSupport: PersistStorage<PersistedMessageState> = {
  getItem: async (name): Promise<PersistedMessageState | null> => {
    const str = await zustandIndexDBStorage.getItem(name);
    if (!str) return null;
    try {
      const parsed = JSON.parse(str, reviver) as PersistedMessageState;
      return parsed;
    } catch (error) {
      console.error(`Error parsing persisted state (${name}):`, error);
      return null;
    }
  },
  setItem: async (name, newValue: PersistedMessageState): Promise<void> => {
    try {
      const str = JSON.stringify(newValue, replacer);
      await zustandIndexDBStorage.setItem(name, str);
    } catch (error) {
      console.error(
        `Error stringifying or setting persisted state (${name}):`,
        error,
      );
    }
  },
  removeItem: async (name): Promise<void> => {
    await zustandIndexDBStorage.removeItem(name);
  },
};
