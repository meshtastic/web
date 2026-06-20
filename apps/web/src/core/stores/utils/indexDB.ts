import { del, get, set } from "idb-keyval";
import type {
  PersistStorage,
  StateStorage,
  StorageValue,
} from "zustand/middleware";

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

type AnyRecord = Record<string, unknown>;

type Envelope<Tag extends string = string, V = unknown> = {
  __datatype: Tag;
  value: V;
};

interface Handler<T, Tag extends string, Encoded> {
  tag: Tag;
  test(val: unknown): val is T;
  serialize(val: T): Encoded;
  revive(encoded: Encoded): T;
}

function isObject(x: unknown): x is AnyRecord {
  return typeof x === "object" && x !== null;
}
function isEnvelope(x: unknown): x is Envelope {
  return isObject(x) && typeof x.__datatype === "string" && "value" in x;
}

// Map handler
type SerializedMap<K = unknown, V = unknown> = Array<[K, V]>;
const mapHandler: Handler<Map<unknown, unknown>, "Map", SerializedMap> = {
  tag: "Map",
  test: (val): val is Map<unknown, unknown> => val instanceof Map,
  serialize: (map) => Array.from(map.entries()),
  revive: (pairs) => new Map(pairs),
};

// Uint8Array handler
const uint8ArrayHandler: Handler<Uint8Array, "Uint8Array", number[]> = {
  tag: "Uint8Array",
  test: (val): val is Uint8Array => val instanceof Uint8Array,
  serialize: (uint8array) => Array.from(uint8array),
  revive: (arr) => new Uint8Array(arr),
};

const defaultHandlers = [mapHandler, uint8ArrayHandler] as const;

function makeJson<H extends Handler<unknown, string, unknown>>(
  handlers: readonly H[],
) {
  const byTag = new Map<H["tag"], H>();
  for (const handler of handlers) {
    byTag.set(handler.tag, handler);
  }

  const replacer = (_: string, value: unknown): unknown => {
    for (const handler of handlers) {
      if (handler.test(value)) {
        const encoded = handler.serialize(value as never);
        const envelope: Envelope<typeof handler.tag, typeof encoded> = {
          __datatype: handler.tag,
          value: encoded,
        };
        return envelope;
      }
    }
    return value;
  };

  const reviver = (_: string, value: unknown): unknown => {
    if (isEnvelope(value)) {
      const handler = byTag.get(value.__datatype);
      if (handler) {
        return handler.revive(
          (value as Envelope<H["tag"], unknown>).value as never,
        );
      }
    }
    return value;
  };

  return { replacer, reviver };
}

export function createStorage<
  T,
  H extends Handler<unknown, string, unknown> = never,
>(extraHandlers: readonly H[] = [] as const): PersistStorage<T> {
  const { replacer, reviver } = makeJson([
    ...defaultHandlers,
    ...extraHandlers,
  ]);
  return {
    getItem: async (name): Promise<StorageValue<T> | null> => {
      const str = await zustandIndexDBStorage.getItem(name);
      if (!str) {
        return null;
      }
      try {
        const parsed = JSON.parse(str, reviver) as StorageValue<T>;
        return parsed;
      } catch (error) {
        console.error(`Error parsing persisted state (${name}):`, error);
        return null;
      }
    },
    setItem: async (name, newValue: StorageValue<T>): Promise<void> => {
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
}
