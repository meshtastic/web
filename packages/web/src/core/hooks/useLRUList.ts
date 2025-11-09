import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * A minimal serializable wrapper so we can store metadata alongside items.
 */
type PersistedPayload<J = unknown> = {
  v: 1; // schema version
  capacity: number; // last used capacity (for info/migrations)
  items: J[]; // serialized items (MRU -> LRU)
};

export type UseLRUListOptions<T, J = unknown> = {
  /** localStorage key */
  key: string;
  /** max number of items to keep (>=1) */
  capacity: number;
  /** optional initial items used when storage is empty/invalid */
  initial?: T[];
  /** equality to de-duplicate items; default: Object.is */
  eq?: (a: T, b: T) => boolean;
  /** convert T -> JSON-safe type; default: (x) => x as unknown as J */
  toJSON?: (t: T) => J;
  /** convert JSON-safe type -> T; default: (x) => x as unknown as T */
  fromJSON?: (j: J) => T;
  /** storage impl (for tests); default: window.localStorage */
  storage?: Storage;
  /** listen to storage events and live-sync across tabs/windows; default: true */
  syncTabs?: boolean;
};

export type UseLRUListReturn<T> = {
  /** Items ordered MRU -> LRU */
  items: T[];
  /** Add or "touch" an item (move to MRU); inserts if missing */
  add: (item: T) => void;
  /** Remove a matching item (no-op if missing) */
  remove: (item: T) => void;
  /** Clear all items */
  clear: () => void;
  /** Whether a matching item exists */
  has: (item: T) => boolean;
  /** Replace the entire list (applies LRU trimming) */
  replaceAll: (next: T[]) => void;
  /** Current capacity (for information) */
  capacity: number;
};

/**
 * useLRUList<T> – maintains a most-recently-used list and persists it to localStorage.
 *
 * MRU is index 0. Adding an existing item "touches" it (moves to front).
 */
export function useLRUList<T, J = unknown>(
  opts: UseLRUListOptions<T, J>,
): UseLRUListReturn<T> {
  const {
    key,
    capacity,
    initial = [],
    eq = Object.is,
    toJSON = (x: T) => x as unknown as J,
    fromJSON = (x: J) => x as unknown as T,
    storage = typeof window !== "undefined" ? window.localStorage : undefined,
    syncTabs = true,
  } = opts;

  if (capacity < 1) {
    // Fail fast in dev; silently coerce in prod
    if (process.env.NODE_ENV !== "production") {
      throw new Error("useLRUList: capacity must be >= 1");
    }
  }

  const effectiveCapacity = Math.max(1, capacity);

  // Guard against SSR or no-storage environments
  const canPersist = !!storage && typeof storage.getItem === "function";

  const readPersisted = useCallback((): T[] | null => {
    if (!canPersist) {
      return null;
    }
    try {
      const raw = storage.getItem(key);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as PersistedPayload<J>;
      if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.items)) {
        return null;
      }
      const deserialized = parsed.items.map(fromJSON);
      return trimToCapacity(deserialized, effectiveCapacity);
    } catch {
      return null;
    }
  }, [canPersist, storage, key, fromJSON, effectiveCapacity]);

  const writePersisted = useCallback(
    (items: T[]) => {
      if (!canPersist) {
        return;
      }
      try {
        const payload: PersistedPayload<J> = {
          v: 1,
          capacity: effectiveCapacity,
          items: items.map(toJSON),
        };
        storage.setItem(key, JSON.stringify(payload));
      } catch {
        // Swallow quota/serialization errors; keep in-memory state working
      }
    },
    [canPersist, storage, key, toJSON, effectiveCapacity],
  );

  // Initialize from storage (or fallback to `initial`)
  const [items, setItems] = useState<T[]>(
    () => readPersisted() ?? trimToCapacity([...initial], effectiveCapacity),
  );

  // Keep a ref to avoid feedback loops when applying remote (storage event) updates
  const applyingExternal = useRef(false);

  // Persist on changes
  useEffect(() => {
    if (applyingExternal.current) {
      applyingExternal.current = false;
      return;
    }
    writePersisted(items);
  }, [items, writePersisted]);

  // Cross-tab synchronization via storage events
  useEffect(() => {
    if (!syncTabs || !canPersist || typeof window === "undefined") {
      return;
    }
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== storage || e.key !== key) {
        return;
      }
      // Another tab changed it; re-read safely
      const next = readPersisted();
      if (!next) {
        return;
      }
      applyingExternal.current = true;
      setItems(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [syncTabs, canPersist, storage, key, readPersisted]);

  // Helpers
  const indexOf = useCallback(
    (arr: T[], needle: T) => arr.findIndex((x) => eq(x, needle)),
    [eq],
  );

  const add = useCallback(
    (item: T) => {
      setItems((prev) => {
        const idx = indexOf(prev, item);
        if (idx === 0) {
          return prev; // already MRU
        }
        if (idx > 0) {
          const next = [...prev];
          next.splice(idx, 1);
          next.unshift(item);
          return next;
        }
        // Not present: insert at MRU and trim
        const next = [item, ...prev];
        return trimToCapacity(next, effectiveCapacity);
      });
    },
    [indexOf, effectiveCapacity],
  );

  const remove = useCallback(
    (item: T) => {
      setItems((prev) => {
        const idx = indexOf(prev, item);
        if (idx === -1) {
          return prev;
        }
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      });
    },
    [indexOf],
  );

  const clear = useCallback(() => setItems([]), []);

  const has = useCallback(
    (item: T) => indexOf(items, item) !== -1,
    [items, indexOf],
  );

  const replaceAll = useCallback(
    (next: T[]) => setItems(trimToCapacity([...next], effectiveCapacity)),
    [effectiveCapacity],
  );

  // Stable API shape
  return useMemo(
    () => ({
      items,
      add,
      remove,
      clear,
      has,
      replaceAll,
      capacity: effectiveCapacity,
    }),
    [items, add, remove, clear, has, replaceAll, effectiveCapacity],
  );
}

// --- utils ---

function trimToCapacity<T>(arr: T[], capacity: number): T[] {
  if (arr.length <= capacity) {
    return arr;
  }
  return arr.slice(0, capacity);
}
